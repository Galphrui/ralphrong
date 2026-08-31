#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
微信模板消息推送工具 - Linux/NAS 命令行版

特点：
1. 不使用 tkinter，不需要可视化界面，适合 Linux / NAS / SSH / cron / systemd 运行。
2. 保留原脚本核心能力：
   - 多个用户 OpenID
   - 多个模板 ID
   - 指定模板 / 随机模板 / 逐条发送全部模板
   - 天气、纪念日天数、生日倒计时、随机文案
   - 每天固定时间发送 / 按分钟间隔循环发送
   - 配置保存到 wechat_pusher_config.json
3. 启动后出现数字菜单：
   第一部分：选择使用已保存配置，或者输入新配置并保存。
   第二部分：选择检测、发送、定时、查看配置等功能。

安装依赖：
    python3 -m pip install requests lunardate wechatpy

运行：
    chmod +x wechat_pusher_cli.py
    ./wechat_pusher_cli.py

也可以：
    python3 wechat_pusher_cli.py
    python3 wechat_pusher_cli.py --send-once
    python3 wechat_pusher_cli.py --schedule
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import signal
import sys
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import requests
from lunardate import LunarDate
from wechatpy import WeChatClient
from wechatpy.client.api import WeChatMessage

os.environ.setdefault("SSL_CERT_FILE", "/etc/ssl/certs/ca-certificates.crt")

APP_DIR = Path(__file__).resolve().parent
CONFIG_FILE = APP_DIR / "wechat_pusher_config.json"
LOG_FILE = APP_DIR / "wechat_pusher.log"

SEND_MODE_SPECIFIED = "specified"
SEND_MODE_RANDOM = "random"
SEND_MODE_ALL = "all"

SEND_MODE_OPTIONS = {
    SEND_MODE_SPECIFIED: "指定模板",
    SEND_MODE_RANDOM: "随机模板",
    SEND_MODE_ALL: "逐条发送全部模板",
}

SCHEDULE_MODE_DAILY = "daily"
SCHEDULE_MODE_INTERVAL = "interval"

DEFAULT_CONFIG: dict[str, Any] = {
    "app_id": "wx002bb00ccedf2263",
    "app_secret": "4b69b0ab9d2bc08d864c65d64b896510",
    "user_openids": [
        "oKM3V2Ltjlw1UM809DLDHk4gVl3k",
        "oKM3V2CU5OJOlI5cWa0YQpvfU_I4",
    ],
    "template_ids": [
        "tE-FdBXfrz8HA9q8k8vj66jAhXrOutgsjvhZeYz9Ha0",
        "98BSIoLET3BY6r3F-q7NfgSEF5VJCt2XxuFqYcNXnMY",
        "kYkmbRxJPfy6YgmZdgkTmYzImDzC8q7XepU5lQ91VEg",
        "j84hm89lLP_zDqDb6DAeEGXI_oypojpjrsqgzjCK2SA",
        "lkAx-w8vSWXo7-xgGECiH3HWCl32rBE30Acoysok2nM",
    ],
    "selected_template_id": "tE-FdBXfrz8HA9q8k8vj66jAhXrOutgsjvhZeYz9Ha0",
    "send_mode": SEND_MODE_RANDOM,
    "start_date": "2025-11-16",
    "city": "汕尾",
    "birthday_type": "农历",
    "birthday": "06-26",
    "birthday_is_leap_month": False,
    "max_retries": "3",
    "schedule_mode": SCHEDULE_MODE_DAILY,
    "schedule_interval_minutes": "1",
    "schedule_daily_time": "07:30",
    "last_send_time": "2026-04-30 07:30:08",
}

LOCAL_QUOTES: list[str] = [
    "今天也要做那个闪闪发光的自己。",
    "慢一点没关系，重要的是一直在向前。",
    "你认真生活的样子，本身就很迷人。",
    "愿你今天有好天气，也有好心情。",
    "别着急，想要的都会在路上。",
    "生活不是赶路，而是感受沿途的每一次温柔。",
    "你已经很棒了，剩下的交给时间。",
    "愿你所遇皆温暖，所行皆坦途。",
]

WEATHER_TRANSLATIONS: dict[str, str] = {
    "patchy rain nearby": "附近有零星小雨",
    "light rain": "小雨",
    "moderate rain": "中雨",
    "heavy rain": "大雨",
    "patchy light rain": "零星小雨",
    "patchy moderate rain": "零星中雨",
    "patchy heavy rain": "零星大雨",
    "sunny": "晴",
    "clear": "晴",
    "partly cloudy": "多云",
    "cloudy": "多云",
    "overcast": "阴",
    "mist": "薄雾",
    "fog": "雾",
    "thunderstorm": "雷暴",
    "light drizzle": "毛毛雨",
    "moderate or heavy rain shower": "阵雨",
    "light rain shower": "小阵雨",
    "moderate or heavy showers of rain": "强阵雨",
    "patchy light drizzle": "零星毛毛雨",
    "patchy snow nearby": "附近有零星小雪",
}


@dataclass
class RuntimeState:
    client: WeChatClient | None = None
    weather: str = "未知"
    temperature: str = "0"
    love_days: int = 0
    birthday_left: int = 0
    words: str = "每天都要加油哦！"
    next_birthday_solar_str: str = "未计算"
    last_send_time: datetime | None = None
    stop_requested: bool = False
    max_retries: int = 3
    retry_count: int = 0
    last_check_ok: bool = False
    status: dict[str, str] = field(default_factory=dict)


class WeChatPusherCLI:
    def __init__(self) -> None:
        self.config = self.load_config()
        self.state = RuntimeState()
        self.state.last_send_time = self.parse_last_send_time(self.config.get("last_send_time", ""))

    # =========================
    # 日志
    # =========================
    def log(self, message: str, level: str = "INFO") -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{now}] [{level}] {message}"
        print(line, flush=True)
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line + "\n")
        except Exception:
            pass

    def set_status(self, key: str, value: str) -> None:
        self.state.status[key] = value
        self.log(f"{key}: {value}")

    # =========================
    # 配置读写
    # =========================
    def load_config(self) -> dict[str, Any]:
        config = dict(DEFAULT_CONFIG)
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                if isinstance(saved, dict):
                    config.update(saved)
            except Exception as e:
                print(f"读取配置失败，将使用默认配置: {e}", file=sys.stderr)

        # 兼容旧字段
        legacy_openid = str(config.get("user_openid", "")).strip()
        if not config.get("user_openids") and legacy_openid:
            config["user_openids"] = [legacy_openid]

        legacy_template_id = str(config.get("template_id", "")).strip()
        if not config.get("template_ids") and legacy_template_id:
            config["template_ids"] = [legacy_template_id]

        if isinstance(config.get("user_openids"), str):
            config["user_openids"] = [
                x.strip() for x in config["user_openids"].splitlines() if x.strip()
            ]

        if isinstance(config.get("template_ids"), str):
            config["template_ids"] = [
                x.strip() for x in config["template_ids"].splitlines() if x.strip()
            ]

        if config.get("send_mode") not in SEND_MODE_OPTIONS:
            config["send_mode"] = SEND_MODE_SPECIFIED

        if config.get("schedule_mode") not in (SCHEDULE_MODE_DAILY, SCHEDULE_MODE_INTERVAL):
            config["schedule_mode"] = SCHEDULE_MODE_DAILY

        if not str(config.get("selected_template_id", "")).strip() and config.get("template_ids"):
            config["selected_template_id"] = config["template_ids"][0]

        return config

    def save_config(self) -> None:
        if self.state.last_send_time:
            self.config["last_send_time"] = self.state.last_send_time.strftime("%Y-%m-%d %H:%M:%S")
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)
        self.log(f"配置已保存: {CONFIG_FILE}")

    @staticmethod
    def parse_last_send_time(value: Any) -> datetime | None:
        text = str(value or "").strip()
        if not text:
            return None
        try:
            return datetime.strptime(text, "%Y-%m-%d %H:%M:%S")
        except Exception:
            return None

    # =========================
    # 命令行输入
    # =========================
    def prompt(self, label: str, default: Any = "", allow_empty: bool = True) -> str:
        default_text = "" if default is None else str(default)
        suffix = f" [{default_text}]" if default_text != "" else ""
        while True:
            value = input(f"{label}{suffix}: ").strip()
            if not value and default_text != "":
                return default_text
            if value or allow_empty:
                return value
            print("该项不能为空，请重新输入。")

    def prompt_bool(self, label: str, default: bool = False) -> bool:
        default_text = "y" if default else "n"
        while True:
            value = self.prompt(f"{label} y/n", default_text).lower()
            if value in ("y", "yes", "是", "1", "true"):
                return True
            if value in ("n", "no", "否", "0", "false"):
                return False
            print("请输入 y 或 n。")

    def prompt_list(self, label: str, default: list[str]) -> list[str]:
        print(f"\n{label}")
        print("说明：每行输入一个值，直接回车结束。")
        if default:
            print("当前已保存：")
            for i, item in enumerate(default, start=1):
                print(f"  {i}. {item}")

        use_old = self.prompt_bool("是否沿用以上列表", bool(default))
        if use_old:
            return [str(x).strip() for x in default if str(x).strip()]

        values: list[str] = []
        while True:
            item = input(f"请输入{label}，回车结束: ").strip()
            if not item:
                break
            if item not in values:
                values.append(item)

        return values

    def select_from_menu(self, title: str, options: list[tuple[str, str]], default: str | None = None) -> str:
        print(f"\n{title}")
        for number, text in options:
            print(f"{number}. {text}")
        while True:
            choice = input(f"请选择数字{f' [{default}]' if default else ''}: ").strip()
            if not choice and default:
                choice = default
            valid_numbers = {number for number, _ in options}
            if choice in valid_numbers:
                return choice
            print("选择无效，请重新输入。")

    # =========================
    # 第一部分：配置选择 / 输入保存
    # =========================
    def initial_config_menu(self) -> None:
        print("\n========== 第一部分：配置来源 ==========")
        print(f"配置文件位置: {CONFIG_FILE}")
        choice = self.select_from_menu(
            "请选择配置方式",
            [
                ("1", "使用已保存配置 / 默认配置"),
                ("2", "重新输入配置并保存"),
                ("3", "查看当前配置"),
            ],
            default="1",
        )

        if choice == "2":
            self.input_and_save_config()
        elif choice == "3":
            self.print_config(mask_secret=True)
            again = self.select_from_menu(
                "下一步",
                [
                    ("1", "使用当前配置继续"),
                    ("2", "重新输入配置并保存"),
                ],
                default="1",
            )
            if again == "2":
                self.input_and_save_config()

    def input_and_save_config(self) -> None:
        print("\n========== 输入并保存配置 ==========")

        self.config["app_id"] = self.prompt("App ID", self.config.get("app_id", ""), allow_empty=False)
        self.config["app_secret"] = self.prompt(
            "App Secret",
            self.config.get("app_secret", ""),
            allow_empty=False,
        )

        self.config["user_openids"] = self.prompt_list(
            "用户 OpenID 列表",
            list(self.config.get("user_openids", [])),
        )
        self.config["template_ids"] = self.prompt_list(
            "模板 ID 列表",
            list(self.config.get("template_ids", [])),
        )

        send_mode_choice = self.select_from_menu(
            "发送模式",
            [
                ("1", "指定模板"),
                ("2", "随机模板"),
                ("3", "逐条发送全部模板"),
            ],
            default=self.send_mode_to_choice(self.config.get("send_mode", SEND_MODE_RANDOM)),
        )
        self.config["send_mode"] = self.choice_to_send_mode(send_mode_choice)

        template_ids = self.get_template_ids()
        if self.config["send_mode"] == SEND_MODE_SPECIFIED:
            selected = self.choose_template_id(template_ids)
            self.config["selected_template_id"] = selected
        else:
            if not str(self.config.get("selected_template_id", "")).strip() and template_ids:
                self.config["selected_template_id"] = template_ids[0]

        self.config["start_date"] = self.prompt(
            "起始日期 YYYY-MM-DD",
            self.config.get("start_date", "2025-11-16"),
            allow_empty=False,
        )
        self.config["city"] = self.prompt("城市", self.config.get("city", "汕尾"), allow_empty=False)

        birthday_type_choice = self.select_from_menu(
            "生日类型",
            [
                ("1", "公历"),
                ("2", "农历"),
            ],
            default="2" if self.config.get("birthday_type") == "农历" else "1",
        )
        self.config["birthday_type"] = "农历" if birthday_type_choice == "2" else "公历"
        self.config["birthday"] = self.prompt(
            "生日 MM-DD",
            self.config.get("birthday", "06-26"),
            allow_empty=False,
        )

        if self.config["birthday_type"] == "农历":
            self.config["birthday_is_leap_month"] = self.prompt_bool(
                "是否为农历闰月生日",
                bool(self.config.get("birthday_is_leap_month", False)),
            )
        else:
            self.config["birthday_is_leap_month"] = False

        self.config["max_retries"] = self.prompt(
            "最大重试次数",
            self.config.get("max_retries", "3"),
            allow_empty=False,
        )

        schedule_mode_choice = self.select_from_menu(
            "定时模式",
            [
                ("1", "每天固定时间"),
                ("2", "按间隔循环"),
            ],
            default="1" if self.config.get("schedule_mode") == SCHEDULE_MODE_DAILY else "2",
        )
        self.config["schedule_mode"] = (
            SCHEDULE_MODE_DAILY if schedule_mode_choice == "1" else SCHEDULE_MODE_INTERVAL
        )
        self.config["schedule_daily_time"] = self.prompt(
            "每天发送时间 HH:MM 或 HH:MM:SS",
            self.config.get("schedule_daily_time", "07:30"),
            allow_empty=False,
        )
        self.config["schedule_interval_minutes"] = self.prompt(
            "循环间隔分钟",
            self.config.get("schedule_interval_minutes", "1"),
            allow_empty=False,
        )

        self.validate_params(raise_error=True)
        self.save_config()

    def choose_template_id(self, template_ids: list[str]) -> str:
        if not template_ids:
            raise ValueError("请至少配置一个模板 ID")

        print("\n请选择指定模板：")
        for i, tid in enumerate(template_ids, start=1):
            print(f"{i}. {tid}")

        current = str(self.config.get("selected_template_id", "")).strip()
        default_index = "1"
        if current in template_ids:
            default_index = str(template_ids.index(current) + 1)

        while True:
            choice = self.prompt("模板序号", default_index, allow_empty=False)
            try:
                index = int(choice)
                if 1 <= index <= len(template_ids):
                    return template_ids[index - 1]
            except Exception:
                pass
            print("模板序号无效，请重新输入。")

    @staticmethod
    def send_mode_to_choice(mode: str) -> str:
        return {
            SEND_MODE_SPECIFIED: "1",
            SEND_MODE_RANDOM: "2",
            SEND_MODE_ALL: "3",
        }.get(mode, "2")

    @staticmethod
    def choice_to_send_mode(choice: str) -> str:
        return {
            "1": SEND_MODE_SPECIFIED,
            "2": SEND_MODE_RANDOM,
            "3": SEND_MODE_ALL,
        }.get(choice, SEND_MODE_RANDOM)

    # =========================
    # 第二部分：功能菜单
    # =========================
    def run_interactive(self) -> None:
        self.initial_config_menu()

        while not self.state.stop_requested:
            print("\n========== 第二部分：功能选择 ==========")
            print("1. 查看当前配置")
            print("2. 检测微信 API、天气、生日、文案")
            print("3. 立即执行一次：检测 + 发送")
            print("4. 仅发送消息（需要先检测，或自动补检测）")
            print("5. 启动定时发送（前台运行，适合 screen/tmux/systemd）")
            print("6. 重新输入配置并保存")
            print("7. 退出")

            choice = input("请选择数字: ").strip()
            try:
                if choice == "1":
                    self.print_config(mask_secret=True)
                elif choice == "2":
                    self.perform_check_workflow()
                elif choice == "3":
                    self.execute_full_send_flow(trigger_source="手动任务")
                elif choice == "4":
                    self.send_message_auto_check()
                elif choice == "5":
                    self.start_scheduler_foreground()
                elif choice == "6":
                    self.input_and_save_config()
                elif choice == "7":
                    self.log("退出程序")
                    break
                else:
                    print("选择无效，请重新输入。")
            except KeyboardInterrupt:
                self.log("收到 Ctrl+C，准备退出", "WARNING")
                self.state.stop_requested = True
            except Exception as e:
                self.log(f"执行失败: {e}", "ERROR")

    # =========================
    # 参数校验
    # =========================
    def validate_params(self, raise_error: bool = False) -> bool:
        errors: list[str] = []

        required = [
            ("App ID", self.config.get("app_id")),
            ("App Secret", self.config.get("app_secret")),
            ("起始日期", self.config.get("start_date")),
            ("城市", self.config.get("city")),
            ("生日", self.config.get("birthday")),
        ]
        for name, value in required:
            if not str(value or "").strip():
                errors.append(f"缺少必填参数: {name}")

        if not self.get_user_ids():
            errors.append("请至少配置一个用户 OpenID")

        if not self.get_template_ids():
            errors.append("请至少配置一个模板 ID")

        if self.config.get("send_mode") == SEND_MODE_SPECIFIED:
            selected = str(self.config.get("selected_template_id", "")).strip()
            if not selected:
                errors.append("当前为指定模板模式，请设置 selected_template_id")
            elif selected not in self.get_template_ids():
                errors.append("selected_template_id 不在 template_ids 列表中")

        if not self.is_valid_ymd(str(self.config.get("start_date", ""))):
            errors.append("起始日期格式错误，应为 YYYY-MM-DD")

        if not self.is_valid_mmdd(str(self.config.get("birthday", ""))):
            errors.append("生日格式错误，应为 MM-DD，例如 06-26")

        try:
            retries = int(str(self.config.get("max_retries", "3")))
            if retries <= 0:
                raise ValueError
        except Exception:
            errors.append("max_retries 必须是大于 0 的整数")

        if self.config.get("schedule_mode") == SCHEDULE_MODE_DAILY:
            try:
                self.parse_daily_time(str(self.config.get("schedule_daily_time", "")))
            except Exception as e:
                errors.append(str(e))
        else:
            try:
                self.get_schedule_interval_seconds()
            except Exception as e:
                errors.append(str(e))

        if errors:
            message = "\n".join(errors)
            if raise_error:
                raise ValueError(message)
            self.log(message, "ERROR")
            return False

        return True

    @staticmethod
    def is_valid_ymd(value: str) -> bool:
        try:
            datetime.strptime(value.strip(), "%Y-%m-%d")
            return True
        except Exception:
            return False

    @staticmethod
    def is_valid_mmdd(value: str) -> bool:
        try:
            month, day = value.strip().split("-")
            month_i = int(month)
            day_i = int(day)
            return 1 <= month_i <= 12 and 1 <= day_i <= 31
        except Exception:
            return False

    @staticmethod
    def parse_mmdd(value: str) -> tuple[int, int]:
        month, day = value.strip().split("-")
        return int(month), int(day)

    # =========================
    # 配置访问
    # =========================
    def get_user_ids(self) -> list[str]:
        values = self.config.get("user_openids", [])
        if isinstance(values, str):
            values = values.splitlines()
        return [str(x).strip() for x in values if str(x).strip()]

    def get_template_ids(self) -> list[str]:
        values = self.config.get("template_ids", [])
        if isinstance(values, str):
            values = values.splitlines()
        return [str(x).strip() for x in values if str(x).strip()]

    def describe_current_template_strategy(self) -> str:
        template_ids = self.get_template_ids()
        mode = str(self.config.get("send_mode", SEND_MODE_SPECIFIED)).strip()
        mode_name = SEND_MODE_OPTIONS.get(mode, "未知")

        if not template_ids:
            return f"{mode_name}（暂无模板）"

        if mode == SEND_MODE_SPECIFIED:
            selected = str(self.config.get("selected_template_id", "")).strip() or "未选择"
            return f"{mode_name}: {selected}"

        if mode == SEND_MODE_RANDOM:
            return f"{mode_name}: 从 {len(template_ids)} 个模板中随机选 1 个"

        return f"{mode_name}: 共 {len(template_ids)} 个模板依次发送"

    def get_effective_template_plan(self) -> tuple[list[str], str]:
        template_ids = self.get_template_ids()
        if not template_ids:
            raise ValueError("请至少添加一个模板 ID")

        mode = str(self.config.get("send_mode", SEND_MODE_SPECIFIED)).strip()
        if mode == SEND_MODE_SPECIFIED:
            selected = str(self.config.get("selected_template_id", "")).strip()
            if not selected:
                raise ValueError("当前为指定模板模式，请先设置 selected_template_id")
            if selected not in template_ids:
                raise ValueError("当前指定模板不在模板列表中，请重新设置")
            return [selected], f"指定模板: {selected}"

        if mode == SEND_MODE_RANDOM:
            selected = random.choice(template_ids)
            return [selected], f"随机模板: {selected}"

        if mode == SEND_MODE_ALL:
            return template_ids[:], f"逐条发送全部模板: 共 {len(template_ids)} 个"

        raise ValueError("未知发送模式")

    # =========================
    # 检测流程
    # =========================
    def perform_check_workflow(self) -> bool:
        if not self.validate_params():
            self.state.last_check_ok = False
            return False

        self.log("=" * 60)
        self.log("开始检测微信推送状态")
        self.log(f"模板策略: {self.describe_current_template_strategy()}")

        try:
            app_id = str(self.config.get("app_id", "")).strip()
            app_secret = str(self.config.get("app_secret", "")).strip()

            self.set_status("连接状态", "连接中")
            self.state.client = WeChatClient(app_id, app_secret)
            try:
                _ = self.state.client.access_token
                self.set_status("连接状态", "已连接")
            except Exception as e:
                self.set_status("连接状态", "连接失败")
                self.log(f"微信 API 连接失败: {e}", "ERROR")
                self.state.last_check_ok = False
                return False

            self.set_status("天气数据", "获取中")
            weather, temperature = self.get_weather(str(self.config.get("city", "")))
            if weather is None or temperature is None:
                self.log("天气获取失败，使用默认值", "WARNING")
                self.state.weather = "未知"
                self.state.temperature = "0"
                self.set_status("天气数据", "获取失败，使用默认值")
            else:
                self.state.weather = weather
                self.state.temperature = str(temperature)
                self.set_status("天气数据", f"{weather} {temperature}°C")

            self.state.love_days = self.get_love_days(str(self.config.get("start_date", "")))
            self.state.birthday_left, birthday_solar_str = self.get_birthday_left(
                str(self.config.get("birthday", "")),
                str(self.config.get("birthday_type", "公历")),
                bool(self.config.get("birthday_is_leap_month", False)),
            )
            self.state.next_birthday_solar_str = birthday_solar_str
            self.set_status("相恋天数", f"{self.state.love_days} 天")
            self.set_status("距离生日", f"{self.state.birthday_left} 天")
            self.set_status("下次生日公历日期", birthday_solar_str)

            self.state.words = self.get_words()
            self.set_status("随机文案", self.state.words)

            self.state.last_check_ok = True
            self.log("检测完成，可以发送消息", "INFO")
            return True

        except Exception as e:
            self.state.last_check_ok = False
            self.log(f"检测过程中出错: {e}", "ERROR")
            return False

    def send_message_auto_check(self) -> bool:
        if not self.state.last_check_ok or not self.state.client:
            self.log("尚未完成检测，先自动执行检测")
            if not self.perform_check_workflow():
                return False
        return self.send_to_all_users()

    def execute_full_send_flow(self, trigger_source: str = "手动任务") -> bool:
        self.log("=" * 60)
        self.log(f"开始执行{trigger_source}: 检测 + 批量发送")
        checked = self.perform_check_workflow()
        if not checked:
            self.log(f"{trigger_source}终止: 检测失败", "ERROR")
            return False

        sent = self.send_to_all_users()
        self.log(f"{trigger_source}结果: {'成功' if sent else '失败'}", "INFO" if sent else "ERROR")
        return sent

    # =========================
    # 发送逻辑
    # =========================
    def build_template_data(self) -> tuple[dict[str, dict[str, str]], str]:
        quote_text = str(self.state.words).strip() or random.choice(LOCAL_QUOTES)
        quote_color = self.get_random_color()
        data = {
            "weather": {"value": str(self.state.weather)},
            "temperature": {"value": str(self.state.temperature)},
            "love_days": {"value": str(self.state.love_days)},
            "birthday_left": {"value": str(self.state.birthday_left)},
            "words": {"value": quote_text, "color": quote_color},
            "remark": {"value": quote_text, "color": quote_color},
        }
        return data, quote_text

    def send_to_all_users(self) -> bool:
        if not self.state.client:
            self.log("微信客户端未初始化，请先检测", "ERROR")
            return False

        user_ids = self.get_user_ids()
        if not user_ids:
            self.log("没有可发送的接收人", "ERROR")
            return False

        try:
            self.state.max_retries = int(str(self.config.get("max_retries", "3")))
        except Exception:
            self.state.max_retries = 3

        self.state.retry_count = 0

        while self.state.retry_count < self.state.max_retries and not self.state.stop_requested:
            try:
                self.state.retry_count += 1
                self.log(f"尝试发送，第 {self.state.retry_count}/{self.state.max_retries} 次")

                template_plan, template_plan_desc = self.get_effective_template_plan()
                data, quote_text = self.build_template_data()
                wm = WeChatMessage(self.state.client)
                total_targets = len(user_ids) * len(template_plan)

                self.log(f"本次发送文案: {quote_text}")
                self.log(f"目标接收人数: {len(user_ids)}")
                self.log(f"模板策略: {template_plan_desc}")
                self.log(f"总发送目标: {total_targets}")

                success_count = 0
                failed_records: list[tuple[str, str, str]] = []
                template_invalid_detected = False

                for template_index, template_id in enumerate(template_plan, start=1):
                    if self.state.stop_requested:
                        self.log("发送被停止", "WARNING")
                        return False

                    self.log(f"开始发送模板 [{template_index}/{len(template_plan)}]: {template_id}")

                    for user_index, user_id in enumerate(user_ids, start=1):
                        if self.state.stop_requested:
                            self.log("发送被停止", "WARNING")
                            return False

                        try:
                            result = wm.send_template(user_id, template_id, data)
                            success_count += 1
                            self.log(
                                f"[模板 {template_index}/{len(template_plan)} | "
                                f"用户 {user_index}/{len(user_ids)}] 发送成功 -> "
                                f"{user_id} | template_id={template_id} | {result}",
                                "INFO",
                            )
                        except Exception as e:
                            err_text = str(e)
                            failed_records.append((template_id, user_id, err_text))
                            self.log(
                                f"[模板 {template_index}/{len(template_plan)} | "
                                f"用户 {user_index}/{len(user_ids)}] 发送失败 -> "
                                f"{user_id} | template_id={template_id} | {err_text}",
                                "ERROR",
                            )
                            if "40037" in err_text or "invalid template_id" in err_text.lower():
                                template_invalid_detected = True

                if not failed_records:
                    self.state.last_send_time = datetime.now()
                    self.save_config()
                    self.log(f"全部发送成功: {success_count}/{total_targets}", "INFO")
                    return True

                if template_invalid_detected:
                    self.log(
                        "检测到模板错误 40037 / invalid template_id。"
                        "常见原因：模板 ID 填错、模板已删除、模板不属于当前 app_id、行业模板变更。",
                        "ERROR",
                    )

                if success_count > 0:
                    self.state.last_send_time = datetime.now()
                    self.save_config()

                error_summary = "；".join(
                    [f"template={tid}, user={uid}, err={err}" for tid, uid, err in failed_records[:3]]
                )
                raise RuntimeError(f"成功 {success_count}/{total_targets}，失败示例: {error_summary}")

            except Exception as e:
                self.log(f"第 {self.state.retry_count} 次发送失败: {e}", "ERROR")
                if self.state.retry_count < self.state.max_retries and not self.state.stop_requested:
                    self.log("等待 3 秒后重试", "WARNING")
                    time.sleep(3)

        self.log(f"发送失败，已重试 {self.state.max_retries} 次", "ERROR")
        return False

    # =========================
    # 定时发送
    # =========================
    def parse_daily_time(self, value: str) -> tuple[int, int, int]:
        value = value.strip()
        for fmt in ("%H:%M:%S", "%H:%M"):
            try:
                parsed = datetime.strptime(value, fmt)
                return parsed.hour, parsed.minute, parsed.second
            except Exception:
                continue
        raise ValueError("固定发送时间格式错误，应为 HH:MM 或 HH:MM:SS")

    def get_schedule_interval_seconds(self) -> int:
        try:
            minutes = int(str(self.config.get("schedule_interval_minutes", "60")).strip())
            if minutes <= 0:
                raise ValueError
            return minutes * 60
        except Exception:
            raise ValueError("循环间隔必须是大于 0 的整数分钟")

    def compute_next_send_time(self, base_time: datetime | None = None) -> datetime:
        now = base_time or datetime.now()
        mode = str(self.config.get("schedule_mode", SCHEDULE_MODE_DAILY)).strip()

        if mode == SCHEDULE_MODE_INTERVAL:
            return now + timedelta(seconds=self.get_schedule_interval_seconds())

        hour, minute, second = self.parse_daily_time(str(self.config.get("schedule_daily_time", "08:00")))
        candidate = now.replace(hour=hour, minute=minute, second=second, microsecond=0)
        if candidate <= now:
            candidate += timedelta(days=1)
        return candidate

    def start_scheduler_foreground(self) -> None:
        if not self.validate_params():
            return

        next_send_time = self.compute_next_send_time()
        self.log("定时发送已启动，按 Ctrl+C 停止", "INFO")
        self.log(f"定时模式: {self.describe_schedule_mode()}")
        self.log(f"下次发送时间: {next_send_time.strftime('%Y-%m-%d %H:%M:%S')}")

        while not self.state.stop_requested:
            now = datetime.now()
            if now >= next_send_time:
                planned_time = next_send_time.strftime("%Y-%m-%d %H:%M:%S")
                self.log(f"到达定时触发时间: {planned_time}，开始执行任务")
                success = self.execute_full_send_flow(trigger_source="定时任务")
                self.log(f"定时任务执行完成: {'成功' if success else '失败'}")
                next_send_time = self.compute_next_send_time()
                self.log(f"下次发送时间: {next_send_time.strftime('%Y-%m-%d %H:%M:%S')}")
            else:
                seconds_left = int((next_send_time - now).total_seconds())
                if seconds_left % 60 == 0 or seconds_left <= 10:
                    self.log(f"距离下次发送还有 {self.format_countdown(seconds_left)}")
                time.sleep(1)

    def describe_schedule_mode(self) -> str:
        mode = str(self.config.get("schedule_mode", SCHEDULE_MODE_DAILY)).strip()
        if mode == SCHEDULE_MODE_INTERVAL:
            return f"按间隔循环，每 {self.config.get('schedule_interval_minutes', '60')} 分钟"
        return f"每天固定时间 {self.config.get('schedule_daily_time', '08:00')}"

    @staticmethod
    def format_countdown(seconds_left: int) -> str:
        seconds_left = max(0, int(seconds_left))
        hours = seconds_left // 3600
        minutes = (seconds_left % 3600) // 60
        seconds = seconds_left % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    # =========================
    # 天气、生日、文案
    # =========================
    @staticmethod
    def normalize_city_name(city: str) -> str:
        city = city.strip()
        if city.endswith("市"):
            city = city[:-1]
        return city

    @staticmethod
    def translate_weather_to_chinese(text: str) -> str:
        if not text:
            return "未知"
        normalized = text.strip().lower()
        if normalized in WEATHER_TRANSLATIONS:
            return WEATHER_TRANSLATIONS[normalized]
        for key, value in WEATHER_TRANSLATIONS.items():
            if key in normalized:
                return value
        return text

    def get_weather(self, city: str) -> tuple[str | None, int | None]:
        city = self.normalize_city_name(city)
        headers = {"User-Agent": "Mozilla/5.0 Python Weather Client"}

        for scheme in ("https", "http"):
            try:
                url = f"{scheme}://autodev.openspeech.cn/csp/api/v2.1/weather"
                params = {
                    "openId": "aiuicus",
                    "clientType": "android",
                    "sign": "android",
                    "city": city,
                }
                self.log(f"正在请求天气接口 {scheme.upper()}: {city}")
                res = requests.get(url, params=params, headers=headers, timeout=10)
                self.log(f"天气接口 HTTP 状态码: {res.status_code}")

                if res.status_code != 200:
                    self.log(f"{scheme.upper()} 天气接口失败: {res.text[:200]}", "WARNING")
                    continue

                data = res.json()
                code = data.get("code")
                if code not in (0, "0", None):
                    self.log(
                        f"{scheme.upper()} 天气接口业务失败: "
                        f"code={data.get('code')}, msg={data.get('msg') or data.get('errmsg')}",
                        "WARNING",
                    )
                    continue

                weather_list = data.get("data", {}).get("list", [])
                if not weather_list:
                    self.log(f"{scheme.upper()} 天气接口返回空列表", "WARNING")
                    continue

                weather_info = weather_list[0]
                weather = weather_info.get("weather", "未知")
                temp = weather_info.get("temp")
                if temp is None:
                    self.log(f"{scheme.upper()} 天气接口缺少 temp 字段", "WARNING")
                    continue

                temp_value = math.floor(float(temp))
                return str(weather), temp_value

            except Exception as e:
                self.log(f"{scheme.upper()} 天气接口请求失败: {e}", "WARNING")

        try:
            backup_url = f"https://wttr.in/{city}"
            params = {"format": "j1", "lang": "zh-cn"}
            self.log("主天气接口失败，尝试备用接口 wttr.in", "WARNING")
            res = requests.get(backup_url, params=params, headers=headers, timeout=10)
            self.log(f"备用天气接口 HTTP 状态码: {res.status_code}")

            if res.status_code == 200:
                data = res.json()
                current = data.get("current_condition", [])
                if current:
                    current_info = current[0]
                    temp_c = current_info.get("temp_C")
                    desc_list = current_info.get("lang_zh") or current_info.get("weatherDesc", [])
                    if isinstance(desc_list, list) and desc_list:
                        desc = desc_list[0].get("value", "未知")
                    else:
                        desc = "未知"
                    desc = self.translate_weather_to_chinese(desc)
                    if temp_c is not None:
                        return desc, math.floor(float(temp_c))
        except Exception as e:
            self.log(f"备用天气接口请求失败: {e}", "WARNING")

        return None, None

    def get_love_days(self, start_date_str: str) -> int:
        try:
            start = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            today = date.today()
            if start > today:
                self.log("起始日期晚于今天，按 0 天处理", "WARNING")
                return 0
            return (today - start).days + 1
        except Exception:
            self.log("起始日期格式错误，应为 YYYY-MM-DD", "WARNING")
            return 0

    def get_birthday_left(
        self,
        birthday_str: str,
        birthday_type: str = "公历",
        is_leap_month: bool = False,
    ) -> tuple[int, str]:
        try:
            today = date.today()
            month, day = self.parse_mmdd(birthday_str)

            if birthday_type == "公历":
                candidate = date(today.year, month, day)
                if candidate < today:
                    candidate = date(today.year + 1, month, day)
            else:
                candidate = self.get_next_solar_birthday_from_lunar(
                    lunar_month=month,
                    lunar_day=day,
                    is_leap_month=is_leap_month,
                    today=today,
                )

            return (candidate - today).days, candidate.strftime("%Y-%m-%d")
        except Exception as e:
            self.log(f"生日计算失败: {e}", "WARNING")
            return 0, "未知"

    @staticmethod
    def get_next_solar_birthday_from_lunar(
        lunar_month: int,
        lunar_day: int,
        is_leap_month: bool,
        today: date,
    ) -> date:
        candidates: list[date] = []
        for year in range(today.year, today.year + 4):
            try:
                solar_date = LunarDate(year, lunar_month, lunar_day, int(is_leap_month)).toSolarDate()
                if solar_date >= today:
                    candidates.append(solar_date)
            except Exception:
                continue
        if not candidates:
            raise ValueError("无法找到未来几年内对应的公历生日，请检查农历日期或闰月设置")
        return min(candidates)

    def get_words(self) -> str:
        headers = {"User-Agent": "Mozilla/5.0 Python Quote Client"}
        quote_apis = [
            ("沙雕彩虹屁", "https://api.shadiao.pro/chp", self.parse_shadiao_quote),
            ("一言", "https://v1.hitokoto.cn/?encode=json", self.parse_hitokoto_quote),
        ]

        for name, url, parser in quote_apis:
            try:
                self.log(f"正在获取随机文案: {name}")
                res = requests.get(url, headers=headers, timeout=10)
                self.log(f"{name} HTTP 状态码: {res.status_code}")
                if res.status_code != 200:
                    continue
                data = res.json()
                text = parser(data)
                if text:
                    return text
            except Exception as e:
                self.log(f"{name} 获取失败: {e}", "WARNING")

        fallback = random.choice(LOCAL_QUOTES)
        self.log("随机文案接口不可用，使用本地备用文案", "WARNING")
        return fallback

    @staticmethod
    def parse_shadiao_quote(data: dict[str, Any]) -> str:
        return str(data.get("data", {}).get("text", "")).strip()

    @staticmethod
    def parse_hitokoto_quote(data: dict[str, Any]) -> str:
        return str(data.get("hitokoto", "")).strip()

    @staticmethod
    def get_random_color() -> str:
        return "#{:06x}".format(random.randint(0, 0xFFFFFF))

    # =========================
    # 展示配置
    # =========================
    def print_config(self, mask_secret: bool = True) -> None:
        data = dict(self.config)
        if mask_secret and data.get("app_secret"):
            secret = str(data["app_secret"])
            if len(secret) > 8:
                data["app_secret"] = secret[:4] + "*" * (len(secret) - 8) + secret[-4:]
            else:
                data["app_secret"] = "********"

        print("\n========== 当前配置 ==========")
        print(json.dumps(data, ensure_ascii=False, indent=2))
        print(f"配置文件: {CONFIG_FILE}")
        print(f"日志文件: {LOG_FILE}")
        print(f"模板策略: {self.describe_current_template_strategy()}")
        print(f"定时模式: {self.describe_schedule_mode()}")


def install_signal_handlers(app: WeChatPusherCLI) -> None:
    def handle_signal(signum: int, frame: Any) -> None:
        app.state.stop_requested = True
        app.log(f"收到退出信号 {signum}，正在停止", "WARNING")

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="微信模板消息推送工具 - Linux/NAS 命令行版")
    parser.add_argument(
        "--send-once",
        action="store_true",
        help="不进入交互菜单，直接执行一次：检测 + 发送",
    )
    parser.add_argument(
        "--schedule",
        action="store_true",
        help="不进入交互菜单，直接以前台方式启动定时发送",
    )
    parser.add_argument(
        "--show-config",
        action="store_true",
        help="显示当前配置后退出",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    app = WeChatPusherCLI()
    install_signal_handlers(app)

    try:
        if args.show_config:
            app.print_config(mask_secret=True)
            return 0

        if args.send_once:
            ok = app.execute_full_send_flow(trigger_source="命令行单次任务")
            return 0 if ok else 1

        if args.schedule:
            app.start_scheduler_foreground()
            return 0

        app.run_interactive()
        return 0
    except KeyboardInterrupt:
        app.state.stop_requested = True
        app.log("收到 Ctrl+C，程序退出", "WARNING")
        return 130
    except Exception as e:
        app.log(f"程序异常退出: {e}", "ERROR")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

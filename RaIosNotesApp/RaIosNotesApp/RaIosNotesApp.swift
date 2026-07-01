import SwiftUI

@main
struct RaIosNotesApp: App {
    @StateObject private var viewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(viewModel)
                .task {
                    await viewModel.bootstrap()
                }
        }
    }
}

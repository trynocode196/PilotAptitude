using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace PilotAptitude;

public partial class MainWindow : Window
{
    private const string HostName = "app.pilotaptitude.local";

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            if (!Directory.Exists(wwwroot))
            {
                LoadingText.Text = $"UI folder missing:\n{wwwroot}";
                return;
            }

            var env = await CoreWebView2Environment.CreateAsync();
            await WebView.EnsureCoreWebView2Async(env);

            WebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                HostName,
                wwwroot,
                CoreWebView2HostResourceAccessKind.Allow);

            WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            WebView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            WebView.CoreWebView2.Navigate($"https://{HostName}/index.html");

            WebView.NavigationCompleted += (_, args) =>
            {
                if (args.IsSuccess)
                {
                    LoadingText.Visibility = Visibility.Collapsed;
                }
            };
        }
        catch (Exception ex)
        {
            LoadingText.Text = "Failed to start WebView2.\nInstall the Evergreen Runtime, then retry.\n\n" + ex.Message;
        }
    }
}

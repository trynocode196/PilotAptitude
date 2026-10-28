using Microsoft.AspNetCore.Mvc.RazorPages;

namespace PilotAptitude.Pages;

public class MemoryModel : PageModel
{
    public string Mode { get; private set; } = "practice";

    public void OnGet(string? mode)
    {
        Mode = string.Equals(mode, "assessment", StringComparison.OrdinalIgnoreCase)
            ? "assessment"
            : "practice";
        ViewData["InitialMode"] = Mode;
    }
}

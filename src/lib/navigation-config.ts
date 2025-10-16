export type NavigationItem = {
  title: string
  url: string
  children?: NavigationItem[]
}

export const navigationConfig: NavigationItem[] = [
  {
    title: "Prompts",
    url: "#",
    children: [
      {
        title: "All Prompts",
        url: "/dashboard/prompts"
      },
      {
        title: "Groups",
        url: "/dashboard/prompt-groups"
      },
      {
        title: "Settings",
        url: "/dashboard/prompt-settings"
      },
      {
        title: "Content Production",
        url: "/dashboard/content-production"
      }
    ]
  },
  {
    title: "Media",
    url: "/dashboard/uploads"
  },
  {
    title: "Tools",
    url: "#",
    children: [
      {
        title: "QR Code",
        url: "/dashboard/tools/qrcode"
      }
    ]
  },
  {
    title: "Playground",
    url: "#",
    children: [
      {
        title: "History",
        url: "#"
      },
      {
        title: "Starred",
        url: "#"
      },
      {
        title: "Settings",
        url: "#"
      }
    ]
  },
  {
    title: "Models",
    url: "#",
    children: [
      {
        title: "Genesis",
        url: "#"
      },
      {
        title: "Explorer",
        url: "#"
      },
      {
        title: "Quantum",
        url: "#"
      }
    ]
  },
  {
    title: "Documentation",
    url: "#",
    children: [
      {
        title: "Introduction",
        url: "#"
      },
      {
        title: "Get Started",
        url: "#"
      },
      {
        title: "Tutorials",
        url: "#"
      },
      {
        title: "Changelog",
        url: "#"
      }
    ]
  },
  {
    title: "Settings",
    url: "#",
    children: [
      {
        title: "General",
        url: "#"
      },
      {
        title: "Workspace",
        url: "#"
      },
      {
        title: "Billing",
        url: "#"
      },
      {
        title: "Limits",
        url: "#"
      }
    ]
  }
]

// Helper function to create a flat map of URLs to titles
export function createUrlTitleMap(config: NavigationItem[]): Record<string, string> {
  const map: Record<string, string> = {}

  function traverse(items: NavigationItem[]) {
    items.forEach(item => {
      if (item.url && item.url !== "#") {
        map[item.url] = item.title
      }
      if (item.children) {
        traverse(item.children)
      }
    })
  }

  traverse(config)
  return map
}

// Pre-computed map for performance
export const urlTitleMap = createUrlTitleMap(navigationConfig)

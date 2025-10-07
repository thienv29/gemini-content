"use client"

import { usePathname } from "next/navigation"
import React from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type NavigationMapping = {
  [key: string]: { title: string; isHome?: boolean }
}

const navigationMapping: NavigationMapping = {
  "/dashboard": { title: "Dashboard", isHome: true },
  "/dashboard/prompts": { title: "All Prompts" },
  "/dashboard/prompt-groups": { title: "Groups" },
  "/dashboard/prompt-settings": { title: "Settings" },
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()

  // Generate breadcrumb items based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbs = []

    // Always start with Dashboard
    breadcrumbs.push({
      title: "Dashboard",
      href: "/dashboard",
      current: pathname === "/dashboard"
    })

    // Build path progressively for navigation
    let currentPath = "/dashboard"
    for (let i = 1; i < pathSegments.length; i++) {
      currentPath += `/${pathSegments[i]}`
      const mapping = navigationMapping[currentPath]
      if (mapping && !mapping.isHome) {
        breadcrumbs.push({
          title: mapping.title,
          href: currentPath,
          current: currentPath === pathname
        })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    // Only dashboard, just show current page
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            <BreadcrumbItem>
              {crumb.current ? (
                <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>
                  {crumb.title}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

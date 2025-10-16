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
import { urlTitleMap } from "@/lib/navigation-config"

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
      const title = urlTitleMap[currentPath]
      if (title) {
        breadcrumbs.push({
          title,
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

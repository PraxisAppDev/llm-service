import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link, useMatches } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";

interface BcItem {
  label: string;
  href: string;
  current: boolean;
}

export function AppBreadcrumbs() {
  const matches = useMatches();
  const [bcItems, setBcItems] = useState<BcItem[]>([]);

  useEffect(() => {
    const items: BcItem[] = [];
    let foundCurrent = false;

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (match.staticData.breadcrumbLabel) {
        items.unshift({
          label: match.staticData.breadcrumbLabel,
          href: match.fullPath,
          current: !foundCurrent,
        });

        if (!foundCurrent) foundCurrent = true;
      }
    }

    setBcItems(items);
  }, [matches]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {bcItems.map((item, idx, list) => (
          <Fragment key={item.href}>
            <BreadcrumbItem
              key={item.href}
              className={item.current ? undefined : "hidden md:block"}
            >
              {item.current ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {idx < list.length - 1 && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

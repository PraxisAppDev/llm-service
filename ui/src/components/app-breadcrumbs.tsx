import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
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
            <BreadcrumbItem key={item.href} className="hidden md:block">
              <BreadcrumbLink asChild>
                {item.current ? (
                  <div>{item.label}</div>
                ) : (
                  <Link to={item.href}>{item.label}</Link>
                )}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {idx < list.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

import { ApiKey, ApiUser } from "@/api";
import { TableSkeleton } from "@/components/app-skeletons";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useUsers } from "@/hooks/use-users";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { format, formatDistance, fromUnixTime, getUnixTime, parseISO } from "date-fns";
import { Ban, CirclePlus, KeyRound, Trash } from "lucide-react";

export const Route = createFileRoute("/_auth/users")({
  component: ApiUsers,
  staticData: {
    breadcrumbLabel: "Manage API Users",
  },
});

const columnHelper = createColumnHelper<ApiUser>();

const columns = [
  columnHelper.display({
    id: "avatar",
    cell: ({ row }) => <UserAvatar userId={row.original.id} userName={row.original.name} />,
  }),
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("email", {
    header: "Email",
  }),
  columnHelper.display({
    id: "keys",
    header: "API Keys",
    cell: ({ row }) => <UserApiKeys apiKeys={row.original.apiKeys} />,
  }),
  columnHelper.accessor((row) => getUnixTime(parseISO(row.createdAt)), {
    id: "createdAt",
    header: "Created",
    cell: (props) => <span>{format(fromUnixTime(props.getValue()), "PPp")}</span>,
  }),
  columnHelper.accessor((row) => getUnixTime(parseISO(row.updatedAt)), {
    id: "updatedAt",
    header: "Updated",
    cell: (props) => <span>{format(fromUnixTime(props.getValue()), "PPp")}</span>,
  }),
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => <RowActions userId={row.original.id} />,
  }),
];

function UserApiKeys({ apiKeys }: { apiKeys: ApiKey[] }) {
  const now = new Date();

  if (apiKeys.length === 0) {
    return <div className="text-muted-foreground italic">No keys</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {apiKeys.map((k, i) => (
        <div key={k.id} className="flex gap-2 items-center">
          <div className="italic">{i + 1}.</div>
          <div className="flex-1 flex flex-col">
            <span className="font-mono">{k.snippet}...</span>
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              Expires in {formatDistance(parseISO(k.expiresAt), now)}
            </span>
          </div>
          <Button variant="outline" size="icon" title="Revoke key">
            <Ban className="text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function RowActions({ userId }: { userId: string }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="icon" title="Create new API key" asChild>
        <Link from={Route.fullPath} to="$userId/keys/new" params={{ userId }} replace>
          <KeyRound />
        </Link>
      </Button>
      <Button variant="outline" size="icon" title="Delete user">
        <Trash className="text-destructive" />
      </Button>
    </div>
  );
}

function ApiUsers() {
  const { isPending, isError, data, error } = useUsers();

  return (
    <>
      <section className="typography">
        <header className="flex justify-between">
          <h1>API Users</h1>
          <Button asChild>
            <Link from={Route.fullPath} to="new">
              <CirclePlus /> Create user
            </Link>
          </Button>
        </header>
        <p>
          API users can exercise LLM-related endpoints of the <em>LLM Service</em>&apos;s API using
          their assigned API keys. API users cannot access this console.
        </p>
      </section>
      <section className="mt-10">
        <p className="text-xl text-muted-foreground pb-4">
          {data
            ? `Found ${data.count} ${data.count === 0 || data.count > 1 ? "users" : "user"}`
            : "Loading users..."}
        </p>
        {isPending && <TableSkeleton />}
        {isError && (
          <div className="p-4 rounded-xl bg-destructive text-destructive-foreground text-center">
            {`Unable to retrieve admin list: ${error.message}`}
          </div>
        )}
        {data && <DataTable columns={columns} data={data.users} />}
      </section>
      <Outlet />
    </>
  );
}

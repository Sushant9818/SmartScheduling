"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  useUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeleteAdminUser,
} from "@/hooks";
import type { MockUser } from "@/lib/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";

type FormRole = "admin" | "therapist" | "client";

export default function AdminUsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MockUser | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<FormRole>("client");

  const { data: users = [], isLoading } = useUsers();
  const createUserMutation = useCreateAdminUser();
  const updateUserMutation = useUpdateAdminUser();
  const deleteUserMutation = useDeleteAdminUser();

  const therapists = users.filter((u) => u.role === "THERAPIST");
  const clients = users.filter((u) => u.role === "CLIENT");
  const admins = users.filter((u) => u.role === "ADMIN");

  function openAdd() {
    setEditing(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("client");
    setDialogOpen(true);
  }

  function openEdit(u: MockUser) {
    setEditing(u);
    setFormName(u.fullName);
    setFormEmail(u.email);
    setFormPassword("");
    setFormRole((u.role?.toLowerCase() ?? "client") as FormRole);
    setDialogOpen(true);
  }

  function handleSave() {
    if (editing) {
      updateUserMutation.mutate(
        {
          id: editing.id,
          payload: {
            name: formName,
            email: formEmail,
            role: formRole,
          },
        },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      if (!formPassword.trim()) {
        return;
      }
      createUserMutation.mutate(
        {
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        },
        { onSuccess: () => setDialogOpen(false) }
      );
    }
  }

  function handleDelete(u: MockUser) {
    if (!confirm(`Delete user "${u.fullName}" (${u.email})? This will also remove their linked profile (client/therapist) and cancel future sessions.`)) {
      return;
    }
    deleteUserMutation.mutate(u.id);
  }

  const roleOptions: { value: FormRole; label: string }[] = [
    { value: "client", label: "Client" },
    { value: "therapist", label: "Therapist" },
    { value: "admin", label: "Admin" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="therapists">Therapists</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="admins">Admins</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <UserTable
                users={users}
                isLoading={isLoading}
                onEdit={openEdit}
                onDelete={handleDelete}
                updatePending={updateUserMutation.isPending}
                deletePending={deleteUserMutation.isPending}
              />
            </TabsContent>
            <TabsContent value="therapists">
              <UserTable
                users={therapists}
                isLoading={isLoading}
                onEdit={openEdit}
                onDelete={handleDelete}
                updatePending={updateUserMutation.isPending}
                deletePending={deleteUserMutation.isPending}
              />
            </TabsContent>
            <TabsContent value="clients">
              <UserTable
                users={clients}
                isLoading={isLoading}
                onEdit={openEdit}
                onDelete={handleDelete}
                updatePending={updateUserMutation.isPending}
                deletePending={deleteUserMutation.isPending}
              />
            </TabsContent>
            <TabsContent value="admins">
              <UserTable
                users={admins}
                isLoading={isLoading}
                onEdit={openEdit}
                onDelete={handleDelete}
                updatePending={updateUserMutation.isPending}
                deletePending={deleteUserMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                disabled={!!editing}
              />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label>Password (required)</Label>
                <Input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as FormRole)}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formName ||
                !formEmail ||
                (!editing && !formPassword.trim()) ||
                createUserMutation.isPending ||
                updateUserMutation.isPending
              }
            >
              {editing
                ? updateUserMutation.isPending
                  ? "Saving…"
                  : "Save"
                : createUserMutation.isPending
                  ? "Adding…"
                  : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserTable({
  users,
  isLoading,
  onEdit,
  onDelete,
  updatePending,
  deletePending,
}: {
  users: MockUser[];
  isLoading: boolean;
  onEdit: (u: MockUser) => void;
  onDelete: (u: MockUser) => void;
  updatePending: boolean;
  deletePending: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (users.length === 0) {
    return <p className="text-muted-foreground py-4">No users in this list.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>{u.fullName}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>
              <Badge variant={u.role === "ADMIN" ? "default" : u.role === "THERAPIST" ? "secondary" : "outline"}>
                {u.role}
              </Badge>
            </TableCell>
            <TableCell>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => onEdit(u)} disabled={updatePending}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 text-destructive hover:text-destructive"
                onClick={() => onDelete(u)}
                disabled={deletePending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

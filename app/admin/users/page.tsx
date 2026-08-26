'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, ShieldCheck, UserCheck, UserX, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  avatar_url: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [roleDialog, setRoleDialog] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState('candidate');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at, avatar_url')
      .order('created_at', { ascending: false });
    setUsers(data as UserRow[] ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (user: UserRow) => {
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: !user.is_active } : u)));
    toast.success(user.is_active ? 'User deactivated' : 'User activated');
  };

  const openRoleDialog = (user: UserRow) => {
    setRoleDialog(user);
    setNewRole(user.role);
  };

  const handleRoleChange = async () => {
    if (!roleDialog) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', roleDialog.id);
    if (error) { toast.error(error.message); return; }
    setUsers((prev) => prev.map((u) => (u.id === roleDialog.id ? { ...u, role: newRole } : u)));
    setRoleDialog(null);
    toast.success('Role updated');
  };

  const filtered = users.filter((u) => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const matchesSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts: Record<string, number> = { all: users.length };
  users.forEach((u) => { counts[u.role] = (counts[u.role] ?? 0) + 1; });

  const roleColor: Record<string, string> = {
    candidate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    recruiter: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">User Management</h1>
        <p className="mt-1 text-muted-foreground">Manage all platform users, roles, and access</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="candidate">Candidates ({counts.candidate ?? 0})</TabsTrigger>
            <TabsTrigger value="recruiter">Recruiters ({counts.recruiter ?? 0})</TabsTrigger>
            <TabsTrigger value="admin">Admins ({counts.admin ?? 0})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Card key={u.id} className={u.is_active ? '' : 'opacity-60'}>
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {u.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={roleColor[u.role]} variant="secondary">
                    {u.role === 'admin' && <Crown className="mr-1 h-3 w-3" />}
                    {u.role}
                  </Badge>
                  {!u.is_active && <Badge variant="destructive">Inactive</Badge>}
                  <Button size="sm" variant="outline" onClick={() => openRoleDialog(u)}>
                    Role
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(u)}>
                    {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!roleDialog} onOpenChange={(v) => !v && setRoleDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role for {roleDialog?.full_name}</DialogTitle>
          </DialogHeader>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="candidate">Candidate</SelectItem>
              <SelectItem value="recruiter">Recruiter</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(null)}>Cancel</Button>
            <Button onClick={handleRoleChange}><ShieldCheck className="mr-2 h-4 w-4" /> Update role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

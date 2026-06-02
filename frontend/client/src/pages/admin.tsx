import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navbar from "@/components/layout/Navbar";
import PageParticles from "@/components/ui/PageParticles";
import { Shield, Users, Trash2, Crown, UserCheck, Loader2, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: pageRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    retry: false,
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setConfirmDelete(null);
      toast({ title: "User deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <p className="text-white/40">Sign in required</p>
      </div>
    );
  }

  if ((user as any).role !== "admin") {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white/60 mb-2">Access Denied</p>
          <p className="text-white/30 text-sm mb-6">You don't have admin privileges.</p>
          <button onClick={() => navigate("/workspace")} className="text-accent-blue text-sm hover:underline">
            Go to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="min-h-screen bg-obsidian relative overflow-hidden">
      <PageParticles count={300} />
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="noise-overlay" />
      </motion.div>
      <Navbar />
      <div className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-5xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 pt-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Admin Dashboard</h1>
                <p className="text-xs font-mono text-white/30">User Management & System Overview</p>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: users?.length || 0, icon: Users },
              { label: "Admins", value: users?.filter(u => u.role === "admin").length || 0, icon: Crown },
              { label: "Verified", value: users?.filter(u => u.isVerified).length || 0, icon: UserCheck },
              { label: "This Week", value: users?.filter(u => new Date(u.createdAt) > new Date(Date.now() - 7 * 86400000)).length || 0, icon: Users },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4"
              >
                <stat.icon className="w-4 h-4 text-white/30 mb-2" />
                <div className="text-2xl font-bold font-display text-white">{stat.value}</div>
                <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Users Table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-display font-semibold text-white/70 flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-blue/60" />
                All Users
              </h2>
              <span className="text-xs font-mono text-white/30">{users?.length || 0} users</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {users?.map((u) => (
                  <div key={u.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{u.fullName}</span>
                        {u.role === "admin" && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20">ADMIN</span>
                        )}
                        {u.isVerified && (
                          <UserCheck className="w-3.5 h-3.5 text-green-400/60" />
                        )}
                      </div>
                      <div className="text-xs font-mono text-white/30 mt-0.5">{u.email}</div>
                      <div className="text-[10px] font-mono text-white/20 mt-0.5">
                        Joined {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.id !== user.id && (
                        <>
                          <button
                            onClick={() => roleMutation.mutate({ id: u.id, role: u.role === "admin" ? "user" : "admin" })}
                            disabled={roleMutation.isPending}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              u.role === "admin"
                                ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                                : "border-white/10 text-white/40 hover:bg-white/5"
                            }`}
                            title={u.role === "admin" ? "Demote to user" : "Promote to admin"}
                          >
                            {u.role === "admin" ? "Demote" : "Make Admin"}
                          </button>

                          {confirmDelete === u.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteMutation.mutate(u.id)}
                                disabled={deleteMutation.isPending}
                                className="text-xs px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-xs px-2 py-1.5 rounded-lg border border-white/10 text-white/40 hover:bg-white/5"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(u.id)}
                              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      {u.id === user.id && (
                        <span className="text-[10px] font-mono text-white/20 italic">You</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

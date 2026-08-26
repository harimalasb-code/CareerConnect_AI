'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCandidate, updateCompletion } from '@/lib/candidate-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Upload, Trash2, Star, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Resume = {
  id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  version: number;
  is_primary: boolean;
  uploaded_at: string;
};

export default function ResumeManagerPage() {
  const { candidate, loading, reload } = useCandidate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Resume | null>(null);

  const loadResumes = useCallback(async (cpId: string) => {
    const { data } = await supabase
      .from('resumes')
      .select('*')
      .eq('candidate_id', cpId)
      .order('uploaded_at', { ascending: false });
    setResumes(data as Resume[] ?? []);
  }, []);

  useEffect(() => {
    if (candidate) loadResumes(candidate.id);
  }, [candidate, loadResumes]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !candidate) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB.');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${candidate.user_id}/resume-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('careerconnect')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('careerconnect').getPublicUrl(filePath);
    const version = resumes.length + 1;
    const isPrimary = resumes.length === 0;

    const { error: insErr } = await supabase.from('resumes').insert({
      candidate_id: candidate.id,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      version,
      is_primary: isPrimary,
    });

    setUploading(false);
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    await loadResumes(candidate.id);
    await updateCompletion(candidate.id);
    await reload();
    toast.success('Resume uploaded');
  };

  const setPrimary = async (r: Resume) => {
    if (!candidate) return;
    await supabase.from('resumes').update({ is_primary: false }).eq('candidate_id', candidate.id);
    await supabase.from('resumes').update({ is_primary: true }).eq('id', r.id);
    await loadResumes(candidate.id);
    toast.success('Primary resume updated');
  };

  const handleDelete = async () => {
    if (!confirmDelete || !candidate) return;
    await supabase.from('resumes').delete().eq('id', confirmDelete.id);
    setConfirmDelete(null);
    await loadResumes(candidate.id);
    await updateCompletion(candidate.id);
    await reload();
    toast.success('Resume deleted');
  };

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <div className="flex h-96 items-center justify-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Resume Manager</h1>
        <p className="mt-1 text-muted-foreground">Upload and manage your resumes. Your primary resume is used for applications.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-10 transition-colors hover:border-primary/40 hover:bg-primary/5">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
            )}
            <div className="text-center">
              <p className="font-medium">{uploading ? 'Uploading…' : 'Click to upload a resume'}</p>
              <p className="text-sm text-muted-foreground">PDF, DOC, or DOCX up to 5MB</p>
            </div>
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your resumes ({resumes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {resumes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">No resumes uploaded</p>
              <p className="text-sm text-muted-foreground">Upload your first resume above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resumes.map((r) => (
                <div key={r.id} className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.file_name}</p>
                      {r.is_primary && (
                        <Badge className="gap-1 bg-success/15 text-success">
                          <Star className="h-3 w-3 fill-current" /> Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      v{r.version} · {fmtSize(r.file_size)} · {new Date(r.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!r.is_primary && (
                      <Button size="sm" variant="ghost" onClick={() => setPrimary(r)}>
                        <Star className="h-4 w-4" /> Set primary
                      </Button>
                    )}
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => setConfirmDelete(r)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete resume?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{confirmDelete?.file_name}&rdquo; will be permanently removed. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

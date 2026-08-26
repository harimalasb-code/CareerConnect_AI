'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Save, Building2, CheckCircle2, Upload } from 'lucide-react';
import { toast } from 'sonner';

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  location: string | null;
  industry: string | null;
  company_size: string | null;
  is_verified: boolean;
};

const companySizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

export default function CompanyProfilePage() {
  const { profile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: compList } = await supabase.from('companies').select('*').eq('recruiter_id', profile.id).order('created_at', { ascending: true });
    const data = (compList && compList.length > 0 ? compList[0] : null) as Company | null;
    setCompany(data);
    if (data) {
      setName(data.name);
      setLogoUrl(data.logo_url ?? '');
      setWebsite(data.website ?? '');
      setDescription(data.description ?? '');
      setLocation(data.location ?? '');
      setIndustry(data.industry ?? '');
      setCompanySize(data.company_size ?? '');
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!profile) return;
    if (!name.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    const payload = {
      recruiter_id: profile.id,
      name: name.trim(),
      logo_url: logoUrl || null,
      website: website || null,
      description: description || null,
      location: location || null,
      industry: industry || null,
      company_size: companySize || null,
    };
    let error;
    if (company) {
      ({ error } = await supabase.from('companies').update(payload).eq('id', company.id));
    } else {
      ({ error } = await supabase.from('companies').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await load();
    toast.success(company ? 'Company updated' : 'Company created');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image too large. Max 2MB.'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('careerconnect').upload(path, file, { cacheControl: '3600', upsert: true });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('careerconnect').getPublicUrl(path);
    setLogoUrl(urlData.publicUrl);
    setUploading(false);
    toast.success('Logo uploaded');
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Company Profile</h1>
        <p className="mt-1 text-muted-foreground">{company ? 'Update your company information' : 'Set up your company to start posting jobs'}</p>
      </div>

      {company && !company.is_verified && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-warning" />
            <p className="text-sm">Your company is pending admin verification. You can still post jobs while waiting.</p>
          </CardContent>
        </Card>
      )}
      {company?.is_verified && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm">Your company is verified.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-primary" /> Company details</CardTitle>
          <CardDescription>This information appears on your job postings and public company page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl">
              <AvatarImage src={logoUrl || undefined} />
              <AvatarFallback className="rounded-xl bg-primary/10 text-lg font-bold text-primary">{initials || 'C'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-primary hover:underline">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploading…' : 'Upload logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, max 2MB</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company name <span className="text-destructive">*</span></Label>
              <Input id="name" placeholder="Acme Inc." value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="San Francisco, CA" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" placeholder="Technology" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company size</Label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {companySizes.map((s) => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">About the company</Label>
            <Textarea id="description" rows={4} placeholder="Tell candidates about your company culture, mission, and values…" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {company ? 'Save changes' : 'Create company'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

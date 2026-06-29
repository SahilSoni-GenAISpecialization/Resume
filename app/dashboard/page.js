'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const FREE_TIER_LIMIT = 5;

const STATUS_OPTIONS = ['Applied'];

const STATUS_COLORS = {
  Applied: { bg: 'rgba(79,142,247,0.12)', border: 'rgba(79,142,247,0.25)', text: '#4f8ef7' },
  Interviewing: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
  Offer: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', text: '#34d399' },
  Rejected: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', text: '#f87171' },
};

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();

  if (value === 'applied') return 'Applied';
  if (value === 'interviewing' || value === 'interview') return 'Interviewing';
  if (value === 'offer' || value === 'offered') return 'Offer';
  if (value === 'rejected' || value === 'reject') return 'Rejected';

  return 'Applied';
}

function toDisplayStatus(status) {
  return normalizeStatus(status);
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [usage, setUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({
    company: '',
    job_title: '',
    status: 'Applied',
    apply_url: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const [{ data: p }, { data: apps }, { data: usg }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('applications').select('*').eq('user_id', user.id).order('applied_at', { ascending: false }),
        supabase.from('user_usage').select('tailor_count').eq('user_id', user.id).single(),
      ]);

      setProfile(p || null);
      setApplications(apps || []);
      setUsage(usg?.tailor_count || 0);
      setLoading(false);
    }

    load();
  }, [supabase]);

  const now = new Date();

  const thisMonthApps = applications.filter((a) => {
    if (!a.applied_at) return false;
    const d = new Date(a.applied_at);
    if (Number.isNaN(d.getTime())) return false;
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const statusCounts = {
  Applied: applications.filter((a) => normalizeStatus(a.status) === 'Applied').length,
  Interviewing: applications.filter((a) => normalizeStatus(a.status) === 'Interviewing').length,
  Offer: applications.filter((a) => normalizeStatus(a.status) === 'Offer').length,
  Rejected: applications.filter((a) => normalizeStatus(a.status) === 'Rejected').length,
};

  const usagePct = Math.min((usage / FREE_TIER_LIMIT) * 100, 100);
  const usageLeft = Math.max(FREE_TIER_LIMIT - usage, 0);

  const filtered =
  statusFilter === 'Applied this month'
    ? thisMonthApps.filter((a) => normalizeStatus(a.status) === 'Applied')
    : applications;

  function openAdd() {
    setEditRow(null);
    setForm({
      company: '',
      job_title: '',
      status: 'Applied',
      apply_url: '',
      notes: '',
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditRow(row);
    setForm({
      company: row.company || '',
      job_title: row.job_title || '',
      status: toDisplayStatus(row.status),
      apply_url: row.apply_url || '',
      notes: row.notes || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.company.trim() || !form.job_title.trim()) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      company: form.company.trim(),
      job_title: form.job_title.trim(),
      status: toDisplayStatus(form.status),
      apply_url: form.apply_url.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editRow) {
      const { data } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', editRow.id)
        .select()
        .single();

      setApplications((prev) => prev.map((a) => (a.id === editRow.id ? data : a)));
    } else {
      const insertPayload = {
        ...payload,
        user_id: user.id,
        applied_at: new Date().toISOString(),
      };

      const { data } = await supabase
        .from('applications')
        .insert(insertPayload)
        .select()
        .single();

      setApplications((prev) => [data, ...prev]);
    }

    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(id) {
    await supabase.from('applications').delete().eq('id', id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    setDeleteId(null);
  }

  async function handleStatusChange(id, status) {
    const displayStatus = toDisplayStatus(status);

    await supabase.from('applications').update({ status: displayStatus }).eq('id', id);

    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: displayStatus } : a))
    );
  }

  const firstName = profile?.first_name || profile?.full_name?.split(' ')?.[0] || 'there';

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #13131a; color: #f0f0f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .shell { min-height: 100vh; background: radial-gradient(circle at top left, rgba(105,162,255,0.07), transparent 30%), radial-gradient(circle at bottom right, rgba(139,92,246,0.05), transparent 25%), #13131a; }

        .topbar { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between; padding: 16px 28px; border-bottom: 1px solid rgba(255,255,255,0.07); background: rgba(19,19,26,0.92); backdrop-filter: blur(20px); }
        .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .brand-mark { width: 36px; height: 36px; border-radius: 9px; background: linear-gradient(135deg, #4f8ef7, #8b5cf6); display: flex; align-items: center; justify-content: center; }
        .brand-name { font-size: 17px; font-weight: 700; }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .btn-ghost { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #a0a0b8; padding: 9px 14px; font-size: 13px; font-weight: 600; border-radius: 9px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit; }
        .btn-ghost:hover { background: rgba(255,255,255,0.09); color: #f0f0f5; }
        .btn-primary { background: #4f8ef7; border: none; color: white; padding: 10px 18px; font-size: 14px; font-weight: 700; border-radius: 9px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit; }
        .btn-primary:hover { background: #6fa3ff; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,142,247,0.3); }

        .layout { max-width: 1280px; margin: 0 auto; padding: 36px 28px; }
        .page-header { margin-bottom: 32px; }
        .page-title { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
        .page-sub { color: #7d7d96; font-size: 14px; }

        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .kpi-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px 22px; }
        .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #6b6b85; margin-bottom: 10px; }
        .kpi-value { font-size: 32px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; margin-bottom: 4px; }
        .kpi-sub { font-size: 12px; color: #6b6b85; }
        .kpi-blue { color: #4f8ef7; }
        .kpi-green { color: #34d399; }
        .kpi-yellow { color: #fbbf24; }

        .usage-bar-wrap { margin-top: 10px; }
        .usage-bar-track { height: 6px; border-radius: 99px; background: rgba(255,255,255,0.07); overflow: hidden; }
        .usage-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }

        .status-row { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
        .status-pill { padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent; transition: all 0.18s; background: rgba(255,255,255,0.04); color: #7d7d96; border-color: rgba(255,255,255,0.08); }
        .status-pill:hover { background: rgba(255,255,255,0.07); color: #f0f0f5; }
        .status-pill.active { background: rgba(79,142,247,0.15); color: #4f8ef7; border-color: rgba(79,142,247,0.3); }
        .status-pill-count { margin-left: 5px; opacity: 0.7; }

        .table-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; }
        .table-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .table-title { font-size: 16px; font-weight: 700; }
        .table-count { font-size: 12px; color: #6b6b85; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        thead th { padding: 12px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #6b6b85; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
        tbody tr { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: rgba(255,255,255,0.02); }
        tbody td { padding: 14px 20px; font-size: 13px; vertical-align: middle; }
        .td-company { font-weight: 700; color: #f0f0f5; }
        .td-role { color: #c8c8d8; }
        .td-date { color: #6b6b85; font-size: 12px; white-space: nowrap; }
        .td-actions { display: flex; gap: 8px; justify-content: flex-end; }

        .status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .status-select { background: transparent; border: none; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; outline: none; padding: 4px 10px; border-radius: 99px; appearance: none; -webkit-appearance: none; }

        .icon-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; color: #a0a0b8; transition: all 0.18s; font-family: inherit; display: inline-flex; align-items: center; gap: 4px; }
        .icon-btn:hover { background: rgba(255,255,255,0.08); color: #f0f0f5; }
        .icon-btn.danger:hover { background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.2); }
        .icon-btn.edit:hover { background: rgba(79,142,247,0.1); color: #4f8ef7; border-color: rgba(79,142,247,0.2); }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 64px 32px; color: #4a4a60; }
        .empty-icon { font-size: 36px; margin-bottom: 14px; opacity: 0.5; }
        .empty-title { font-size: 16px; font-weight: 600; color: #6b6b85; margin-bottom: 6px; }
        .empty-sub { font-size: 13px; color: #4a4a60; line-height: 1.7; max-width: 320px; margin-bottom: 20px; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #1a1a24; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 28px; width: 100%; max-width: 480px; box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
        .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 22px; }
        .field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
        .label { font-size: 11px; font-weight: 700; color: #c8c8d8; text-transform: uppercase; letter-spacing: 0.06em; }
        .input, .select-input, .textarea-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #f0f0f5; border-radius: 10px; padding: 11px 13px; font-size: 14px; outline: none; font-family: inherit; transition: all 0.2s; }
        .input::placeholder, .textarea-input::placeholder { color: #4a4a60; }
        .input:focus, .select-input:focus, .textarea-input:focus { border-color: rgba(79,142,247,0.5); box-shadow: 0 0 0 3px rgba(79,142,247,0.1); }
        .textarea-input { resize: vertical; min-height: 80px; line-height: 1.6; }
        .modal-actions { display: flex; gap: 10px; margin-top: 6px; justify-content: flex-end; }
        .btn-cancel { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #a0a0b8; padding: 10px 18px; font-size: 14px; font-weight: 600; border-radius: 9px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .btn-cancel:hover { background: rgba(255,255,255,0.08); color: #f0f0f5; }

        .confirm-bar { background: rgba(248,113,113,0.07); border: 1px solid rgba(248,113,113,0.18); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
        .confirm-text { font-size: 13px; color: #f87171; }
        .confirm-actions { display: flex; gap: 8px; }
        .btn-danger { background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.3); color: #f87171; padding: 7px 14px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all 0.18s; }
        .btn-danger:hover { background: rgba(248,113,113,0.25); }

        .spin { width: 16px; height: 16px; border: 2px solid rgba(79,142,247,0.2); border-top-color: #4f8ef7; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .apply-link { color: #4f8ef7; text-decoration: none; font-size: 12px; display: inline-flex; align-items: center; gap: 3px; }
        .apply-link:hover { text-decoration: underline; }

        @media (max-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .kpi-grid { grid-template-columns: 1fr 1fr; }
          .layout { padding: 20px 16px; }
          .topbar { padding: 14px 16px; }
          thead th:nth-child(4), tbody td:nth-child(4) { display: none; }
        }
      `}</style>

      <div className="shell">
        <nav className="topbar">
          <a href="/app" className="brand">
            <div className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="14" y2="17" />
              </svg>
            </div>
            <div className="brand-name">Applymatic</div>
          </a>

          <div className="topbar-right">
            <a href="/search" className="btn-ghost">Job search</a>
            <a href="/app" className="btn-ghost">Profile</a>
          </div>
        </nav>

        <main className="layout">
          <div className="page-header">
            <div className="page-title">
              {loading ? 'Dashboard' : `Welcome back, ${firstName} 👋`}
            </div>
            <div className="page-sub">
              Track every application, monitor your free tier usage, and stay on top of your job hunt.
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total applications</div>
              <div className="kpi-value kpi-blue">{loading ? '—' : applications.length}</div>
              <div className="kpi-sub">all time</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">This month</div>
              <div className="kpi-value kpi-green">{loading ? '—' : thisMonthApps.length}</div>
              <div className="kpi-sub">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            </div>


            <div className="kpi-card">
              <div className="kpi-label">Free tier usage</div>
              <div className="kpi-value" style={{ color: usagePct >= 80 ? '#f87171' : '#34d399', fontSize: 28 }}>
                {loading ? '—' : `${usage} / ${FREE_TIER_LIMIT}`}
              </div>
              <div className="usage-bar-wrap">
                <div className="usage-bar-track">
                  <div
                    className="usage-bar-fill"
                    style={{
                      width: loading ? '0%' : `${usagePct}%`,
                      background:
                        usagePct >= 80
                          ? 'linear-gradient(90deg, #f87171, #ef4444)'
                          : 'linear-gradient(90deg, #34d399, #4f8ef7)',
                    }}
                  />
                </div>
                <div className="kpi-sub" style={{ marginTop: 6 }}>
                  {loading ? '' : usageLeft > 0 ? `${usageLeft} tailors remaining` : 'Limit reached — upgrade to continue'}
                </div>
              </div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <div>
                <div className="table-title">Applications</div>
                <div className="table-count">
  {filtered.length} {statusFilter === 'All' ? 'total' : 'applied this month'}
</div>
              </div>
              <button className="btn-primary" onClick={openAdd}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add application
              </button>
            </div>

            <div style={{ padding: '14px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="status-row">
                {[
  { label: 'All', count: applications.length },
  {
    label: 'Applied this month',
    count: thisMonthApps.filter((a) => normalizeStatus(a.status) === 'Applied').length,
  },
].map((item) => (
  <button
    key={item.label}
    className={`status-pill${statusFilter === item.label ? ' active' : ''}`}
    onClick={() => setStatusFilter(item.label)}
    style={
      statusFilter === item.label && item.label !== 'All'
        ? {
            background: STATUS_COLORS.Applied.bg,
            borderColor: STATUS_COLORS.Applied.border,
            color: STATUS_COLORS.Applied.text,
          }
        : {}
    }
  >
    {item.label}
    <span className="status-pill-count">{item.count}</span>
  </button>
))}
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="spin" style={{ width: 24, height: 24, marginBottom: 16 }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">
  {statusFilter === 'All' ? 'No applications yet' : 'No applied applications this month'}
</div>
<div className="empty-sub">
  {statusFilter === 'All'
    ? 'Start tracking your job applications here. Add one manually or apply directly from the job search.'
    : 'No applications with Applied status were added this month.'}
</div>
                {statusFilter === 'All' && (
                  <button className="btn-primary" onClick={openAdd}>Add first application</button>
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => {
                    const displayStatus = toDisplayStatus(app.status);
                    const sc = STATUS_COLORS[displayStatus] || STATUS_COLORS['Applied'];

                    return (
                      <tr key={app.id}>
                        <td>
                          <div className="td-company">{app.company}</div>
                          {app.apply_url && (
                            <a href={app.apply_url} target="_blank" rel="noopener noreferrer" className="apply-link">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              View posting
                            </a>
                          )}
                        </td>

                        <td className="td-role">{app.job_title}</td>

                        <td>
                          <div
                            className="status-badge"
                            style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
                          >
                            <span className="status-dot" style={{ background: sc.text }} />
                            <select
                              className="status-select"
                              value={displayStatus}
                              onChange={(e) => handleStatusChange(app.id, e.target.value)}
                              style={{ color: sc.text, background: 'transparent' }}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s} style={{ background: '#1a1a24', color: '#f0f0f5' }}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="td-date">
                          {app.applied_at
                            ? new Date(app.applied_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td>
                          <div className="td-actions">
                            <button className="icon-btn edit" onClick={() => openEdit(app)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Edit
                            </button>

                            <button
                              className="icon-btn danger"
                              onClick={() => setDeleteId(deleteId === app.id ? null : app.id)}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                              Delete
                            </button>
                          </div>

                          {deleteId === app.id && (
                            <div className="confirm-bar">
                              <span className="confirm-text">Delete this application?</span>
                              <div className="confirm-actions">
                                <button
                                  className="btn-cancel"
                                  style={{ padding: '5px 12px', fontSize: 12 }}
                                  onClick={() => setDeleteId(null)}
                                >
                                  Cancel
                                </button>
                                <button className="btn-danger" onClick={() => handleDelete(app.id)}>
                                  Yes, delete
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">{editRow ? 'Edit application' : 'Add application'}</div>

            <div className="field">
              <label className="label">Company *</label>
              <input
                className="input"
                placeholder="e.g. Scotiabank"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Role / Job title *</label>
              <input
                className="input"
                placeholder="e.g. Network Tools Specialist"
                value={form.job_title}
                onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Status</label>
              <select
                className="select-input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Apply URL</label>
              <input
                className="input"
                placeholder="https://..."
                value={form.apply_url}
                onChange={(e) => setForm((f) => ({ ...f, apply_url: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Notes</label>
              <textarea
                className="textarea-input"
                placeholder="Referral contact, interview date, notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !form.company.trim() || !form.job_title.trim()}
              >
                {saving ? <><div className="spin" />Saving...</> : editRow ? 'Save changes' : 'Add application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpenCheck, CalendarDays, Download, Loader2, RefreshCw, Save, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

const departments = [
  "CE", "IT", "AI&DS", "E&TC", "Mechanical", "MBA", "First Year",
];

const sessionSlots = {
  Theory: ["9:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:15 AM - 12:15 PM", "12:15 PM - 1:15 PM", "2:00 PM - 3:00 PM", "3:00 PM - 4:00 PM"],
  Practical: ["9:00 AM - 11:00 AM", "11:15 AM - 1:15 PM", "2:00 PM - 4:00 PM"],
};

type Entry = {
  id: number; lectureDate: string; facultyName: string; department: string;
  className: string; division: string; subjectName: string; sessionType: string;
  periodTime: string; totalStudents: number; presentStudents: number; remarks: string;
};

type ModelContext = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const initialForm = {
  lectureDate: localDate(), facultyName: "", department: departments[0], className: "FE",
  division: "A", subjectName: "", sessionType: "Theory", periodTime: sessionSlots.Theory[0],
  totalStudents: "", presentStudents: "", remarks: "",
};

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "field field-wide" : "field"}><Label>{label}</Label>{children}</div>;
}

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [department, setDepartment] = useState("All Departments");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (department !== "All Departments") p.set("department", department);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const response = await fetch(`/api/attendance?${p.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEntries(data);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to load records." });
    } finally { setLoading(false); }
  }, [department, from, to]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const schema = {
      type: "object", additionalProperties: false,
      properties: {
        lectureDate:{type:"string"}, facultyName:{type:"string"}, department:{type:"string"},
        className:{type:"string",enum:["FE","SE","TE","BE"]}, division:{type:"string"},
        subjectName:{type:"string"}, sessionType:{type:"string",enum:["Theory","Practical"]},
        periodTime:{type:"string"}, totalStudents:{type:"integer",minimum:1},
        presentStudents:{type:"integer",minimum:0}, remarks:{type:"string"},
      },
      required:["lectureDate","facultyName","department","className","division","subjectName","sessionType","periodTime","totalStudents","presentStudents"],
    };
    void Promise.resolve(context.registerTool({
      name:"create_attendance_entry", title:"Record lecture attendance",
      description:"Save one completed theory or practical session and its student attendance.",
      inputSchema:schema, annotations:{readOnlyHint:false,untrustedContentHint:false},
      async execute(input: unknown) {
        const response=await fetch("/api/attendance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
        const result=await response.json(); if(!response.ok) throw new Error(result.error || "Entry could not be saved");
        await loadEntries(); return {id:result.id,status:"saved"};
      },
    },{signal:lifecycle.signal})).catch(()=>undefined);
    return () => lifecycle.abort();
  }, [loadEntries]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) => [e.facultyName, e.subjectName, e.className, e.division, e.sessionType].some(v => v.toLowerCase().includes(needle)));
  }, [entries, query]);

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, e) => sum + e.totalStudents, 0);
    const present = filtered.reduce((sum, e) => sum + e.presentStudents, 0);
    return { sessions: filtered.length, present, percentage: total ? Math.round((present / total) * 100) : 0 };
  }, [filtered]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setNotice(null);
    const total = Number(form.totalStudents), present = Number(form.presentStudents);
    if (present > total) { setNotice({ kind: "error", text: "Present students cannot be more than total students." }); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotice({ kind: "ok", text: "Lecture attendance saved successfully." });
      setForm({ ...initialForm, lectureDate: form.lectureDate, facultyName: form.facultyName, department: form.department });
      await loadEntries();
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "Entry could not be saved." }); }
    finally { setSaving(false); }
  }

  function exportExcel() {
    const headers = ["Sr. No.","Date","Faculty Name","Department","Class","Division","Subject","Session Type","Time Slot","Total Students","Present","Absent","Attendance %","Remarks"];
    const shortDepartment: Record<string,string> = {
      "Computer Engineering":"CE", "Information Technology":"IT", "Artificial Intelligence & Data Science":"AI&DS",
      "Electronics & Telecommunication":"E&TC", "Mechanical Engineering":"Mechanical", "First Year Engineering":"First Year",
    };
    const safe = (value: string | number) => String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
    const reportPeriod = from || to ? `${from || "Beginning"} to ${to || "Today"}` : "All Records";
    const tableRows = filtered.map((e,i) => {
      const values = [i+1,e.lectureDate,e.facultyName,shortDepartment[e.department] || e.department,e.className,e.division,e.subjectName,e.sessionType,e.periodTime,e.totalStudents,e.presentStudents,e.totalStudents-e.presentStudents,`${Math.round(e.presentStudents/e.totalStudents*100)}%`,e.remarks];
      return `<tr>${values.map(v=>`<td>${safe(v)}</td>`).join("")}</tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Calibri,Arial,sans-serif} table{border-collapse:collapse;width:100%} th,td{border:1px solid #000;padding:7px;text-align:center;vertical-align:middle} th{background:#1f4e78;color:#fff;font-weight:bold} .title{background:#17365d;color:#fff;font-size:18px;font-weight:bold;height:34px}.subtitle{background:#d9eaf7;font-weight:bold}.left{text-align:left}
    </style></head><body><table><tr><th class="title" colspan="14">PVGCOE &amp; SSDIOM, Nashik</th></tr><tr><th class="subtitle" colspan="14">Lecture &amp; Practical Attendance Report — ${safe(reportPeriod)}</th></tr><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr>${tableRows}</table></body></html>`;
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\uFEFF",html],{type:"application/vnd.ms-excel;charset=utf-8"}));
    a.download=`lecture-attendance-${from || "all"}-${to || localDate()}.xls`; a.click(); URL.revokeObjectURL(a.href);
  }

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <main className="app-shell">
      <header className="topbar">
        <img className="college-logo" src="/pvgcoenashik-logo.png" alt="PVGCOE & SSDIOM, Nashik" />
        <div className="system-title"><p className="eyebrow">Centralized Academic Records</p><h1>PVG&apos;s Academic Monitoring System</h1></div>
        <div className="pilot-pill">College Pilot</div>
      </header>

      <section className="intro-row">
        <div><p className="section-kicker">Daily academic record</p><h2>Record every lecture. Retrieve any day.</h2><p>One centralized record for theory and practical sessions across all engineering departments.</p></div>
        <div className="date-chip"><CalendarDays /><span>Today<br/><strong>{new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</strong></span></div>
      </section>

      <section className="stats-grid" aria-label="Attendance summary">
        <div className="stat-card"><span><BookOpenCheck /></span><div><p>Sessions</p><strong>{stats.sessions}</strong></div></div>
        <div className="stat-card"><span><Users /></span><div><p>Total Present</p><strong>{stats.present}</strong></div></div>
        <div className="stat-card accent"><span><BarChart3 /></span><div><p>Average Attendance</p><strong>{stats.percentage}%</strong></div></div>
      </section>

      <div className="workspace-grid">
        <section className="panel entry-panel">
          <div className="panel-heading"><div><p className="section-kicker">Faculty entry</p><h3>Add Lecture / Practical</h3></div><span>All fields marked * are required</span></div>
          <form onSubmit={submit} className="entry-form">
            <Field label="Date *"><Input type="date" required value={form.lectureDate} onChange={e=>set("lectureDate",e.target.value)} /></Field>
            <Field label="Faculty Name *"><Input required placeholder="Enter full name" value={form.facultyName} onChange={e=>set("facultyName",e.target.value)} /></Field>
            <Field label="Department *" wide><NativeSelect required className="w-full" value={form.department} onChange={e=>set("department",e.target.value)}>{departments.map(d=><NativeSelectOption key={d}>{d}</NativeSelectOption>)}</NativeSelect></Field>
            <Field label="Class *"><NativeSelect className="w-full" value={form.className} onChange={e=>set("className",e.target.value)}>{["FE","SE","TE","BE"].map(v=><NativeSelectOption key={v}>{v}</NativeSelectOption>)}</NativeSelect></Field>
            <Field label="Division *"><Input required value={form.division} onChange={e=>set("division",e.target.value)} /></Field>
            <Field label="Subject Name *" wide><Input required placeholder="e.g. Database Management Systems" value={form.subjectName} onChange={e=>set("subjectName",e.target.value)} /></Field>
            <Field label="Session Type *"><NativeSelect className="w-full" value={form.sessionType} onChange={e=>setForm(current=>({...current,sessionType:e.target.value,periodTime:sessionSlots[e.target.value as keyof typeof sessionSlots][0]}))}><NativeSelectOption>Theory</NativeSelectOption><NativeSelectOption>Practical</NativeSelectOption></NativeSelect></Field>
            <Field label="Period / Time *"><NativeSelect required className="w-full" value={form.periodTime} onChange={e=>set("periodTime",e.target.value)}>{sessionSlots[form.sessionType as keyof typeof sessionSlots].map(slot=><NativeSelectOption key={slot}>{slot}</NativeSelectOption>)}</NativeSelect></Field>
            <Field label="Total Students *"><Input type="number" min="1" required placeholder="60" value={form.totalStudents} onChange={e=>set("totalStudents",e.target.value)} /></Field>
            <Field label="Present Students *"><Input type="number" min="0" required placeholder="52" value={form.presentStudents} onChange={e=>set("presentStudents",e.target.value)} /></Field>
            <Field label="Remarks" wide><Textarea placeholder="Optional note" rows={2} value={form.remarks} onChange={e=>set("remarks",e.target.value)} /></Field>
            {notice && <div className={`notice ${notice.kind}`} role="status">{notice.text}</div>}
            <Button size="lg" className="submit-button" disabled={saving}>{saving ? <Loader2 className="animate-spin"/> : <Save/>}{saving ? "Saving…" : "Submit Attendance"}</Button>
          </form>
        </section>

        <section className="panel records-panel">
          <div className="panel-heading"><div><p className="section-kicker">Centralized register</p><h3>Attendance Records</h3></div><Button variant="outline" onClick={exportExcel} disabled={!filtered.length}><Download/>Download Formatted Excel</Button></div>
          <div className="filters">
            <div className="search-box"><Search/><Input aria-label="Search records" placeholder="Search faculty, subject or class" value={query} onChange={e=>setQuery(e.target.value)} /></div>
            <NativeSelect className="w-full" value={department} onChange={e=>setDepartment(e.target.value)}><NativeSelectOption>All Departments</NativeSelectOption>{departments.map(d=><NativeSelectOption key={d}>{d}</NativeSelectOption>)}</NativeSelect>
            <Input aria-label="From date" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
            <Input aria-label="To date" type="date" value={to} onChange={e=>setTo(e.target.value)} />
            <Button aria-label="Refresh records" variant="outline" size="icon" onClick={loadEntries}><RefreshCw/></Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Faculty & Subject</th><th>Class</th><th>Session</th><th>Attendance</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="empty"><Loader2 className="animate-spin"/> Loading records…</td></tr> :
                filtered.length ? filtered.map(e => {
                  const pct = Math.round(e.presentStudents/e.totalStudents*100);
                  return <tr key={e.id}><td><strong>{new Date(e.lectureDate+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</strong><small>{e.department}</small></td><td><strong>{e.facultyName}</strong><small>{e.subjectName}</small></td><td><strong>{e.className} · Div {e.division}</strong><small>{e.periodTime}</small></td><td><span className={`session ${e.sessionType.toLowerCase()}`}>{e.sessionType}</span></td><td><strong>{e.presentStudents}/{e.totalStudents}</strong><small className={pct < 75 ? "low" : "good"}>{pct}% present</small></td></tr>;
                }) : <tr><td colSpan={5} className="empty"><BookOpenCheck/>No attendance records found.<small>Submit the first lecture entry using the form.</small></td></tr>}
              </tbody>
            </table>
          </div>
          <p className="record-count">Showing {filtered.length} record{filtered.length === 1 ? "" : "s"}</p>
        </section>
      </div>
      <footer>PVG&apos;s Academic Monitoring System · PVGCOE & SSDIOM, Nashik</footer>
    </main>
  );
}

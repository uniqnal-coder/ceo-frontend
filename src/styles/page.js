// Shared style tokens for the CRUD resource pages (Tasks, Salary, Feedback,
// Evaluations, Biometry, Attendance — and available to Students/Staff/Fees).
// Modernized to match the dashboard design system: soft shadows, 16px radii,
// an 8px spacing rhythm, brand-green primary actions and a neutral slate scale.
const C = {
  brand: '#188a54',
  info: '#3066b4',
  danger: '#ef4444',
  ink: '#1e293b',
  body: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  softLine: '#eef2f6',
  surface: '#ffffff',
  subtle: '#f8fafc',
}

const shadow = '0 1px 2px rgba(15,23,42,0.06)';

export const styles = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  subtitle: { color: C.muted, margin: '4px 0 0 0', fontSize: '14px' },

  addButton: { padding: '10px 18px', backgroundColor: C.brand, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, boxShadow: shadow },

  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { backgroundColor: C.surface, padding: '20px', borderRadius: '16px', border: `1px solid ${C.softLine}`, boxShadow: shadow },
  statLabel: { fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, marginBottom: '8px' },
  statValue: { fontSize: '26px', fontWeight: 800, color: C.ink },

  filterContainer: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  filterBtn: { padding: '8px 14px', border: `1px solid ${C.line}`, backgroundColor: C.surface, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: C.body },

  loading: { textAlign: 'center', padding: '40px', color: C.muted },
  error: { color: '#b91c1c', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', margin: '16px 0' },
  empty: { textAlign: 'center', padding: '56px 24px', backgroundColor: C.surface, borderRadius: '16px', border: `1px dashed ${C.line}`, color: C.muted },
  emptyButton: { marginTop: '16px', padding: '10px 20px', backgroundColor: C.brand, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 },

  tableContainer: { backgroundColor: C.surface, borderRadius: '16px', border: `1px solid ${C.softLine}`, overflow: 'auto', boxShadow: shadow },
  table: { width: '100%', borderCollapse: 'collapse' },
  nameCell: { fontWeight: 600, color: C.ink },
  salaryCell: { fontWeight: 600, color: C.brand },
  amountCell: { fontWeight: 600, color: C.brand },
  badge: { padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', color: 'white', fontWeight: 600, display: 'inline-block' },

  editBtn: { padding: '6px 12px', backgroundColor: C.info, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, marginRight: '8px' },
  deleteBtn: { padding: '6px 12px', backgroundColor: C.danger, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 },
  smallBtn: { padding: '6px 12px', backgroundColor: C.brand, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, marginRight: '8px' },

  formContainer: { padding: '24px', maxWidth: '760px', margin: '0 auto' },
  formCard: { backgroundColor: C.surface, padding: '28px', borderRadius: '16px', border: `1px solid ${C.softLine}`, boxShadow: '0 1px 3px rgba(15,23,42,0.08)' },
  form: { marginTop: '20px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  formGroup: { marginBottom: '18px' },
  input: { width: '100%', padding: '10px 12px', border: `1px solid ${C.line}`, borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', color: C.ink },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  cancelBtn: { padding: '10px 18px', backgroundColor: '#f1f5f9', color: C.body, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '10px 18px', backgroundColor: C.brand, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 },
  errorText: { color: C.danger, fontSize: '12px', marginTop: '4px', display: 'block' },
};

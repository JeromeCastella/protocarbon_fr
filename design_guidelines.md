# Design Guidelines — CarbonScope

## Référence : DashboardResultsTab

### Cards
- Light: `rounded-2xl bg-white shadow-sm border border-gray-100`
- Dark: `rounded-2xl bg-slate-800`
- Padding: `p-4` (compact) ou `p-6` (section)
- No heavy shadows — light `shadow-sm` only

### Section containers
- `space-y-6` between major sections
- `gap-4` between grid items

### Icons in cards
- Container: `p-3 rounded-xl` with subtle bg (`bg-slate-100` / `bg-slate-700` or colored `bg-{color}-500/20`)
- Icon: `w-6 h-6` in matching color

### Text hierarchy
- Label: `text-xs uppercase tracking-wide` + `text-slate-400` / `text-gray-500`
- Value: `text-2xl font-bold` + `text-white` / `text-gray-900`
- Unit/secondary: `text-sm` + `text-slate-400` / `text-gray-500`
- Section title: `text-lg font-semibold` + `text-white` / `text-gray-900`
- Subsection: `text-sm font-medium`

### Animation
- Cards: `motion.div` with `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`
- Stagger: `transition={{ delay: index * 0.05 }}`

### Chart containers
- Same card style as above
- Height: `h-80`
- CartesianGrid: `strokeDasharray="2 4"` + `stroke={isDark ? '#334155' : '#f1f5f9'}` + `vertical={false}`
- Axes: `axisLine={false} tickLine={false}` + `fill={isDark ? '#94a3b8' : '#6b7280'}` + `fontSize: 12`
- Tooltip: `rounded-lg shadow-lg` + `bg-slate-800 border-slate-700` / `bg-white border-gray-200`

### Color palette (pastel)
- Scope 1: `#FB923C` (orange)
- Scope 2: `#60A5FA` (blue)
- Scope 3 Amont: `#A78BFA` (violet)
- Scope 3 Aval: `#F9A8D4` (pink)
- Categories: `['#A78BFA', '#60A5FA', '#34D399', '#6EE7B7', '#FCD34D', '#FCA5A5', '#F9A8D4', '#818CF8', '#BEF264', '#FB923C']`

### Status badges
- Rounded: `px-2.5 py-1 rounded-full text-xs font-medium`
- Colors: `bg-{color}-500/20 text-{color}-500`

### Tables
- Header: `text-xs uppercase tracking-wide` + `text-slate-400` / `text-gray-500`
- Rows: `py-4 px-4` + `border-b border-slate-700/50` / `border-gray-100`
- Hover: `hover:bg-slate-700/30` / `hover:bg-gray-50`

### Buttons
- Primary: `bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2`
- Ghost: `hover:bg-slate-700/50` / `hover:bg-gray-100` + `rounded-lg`

### Page header
- Title: `text-2xl font-bold` + `text-white` / `text-gray-900`
- Description: `text-sm` + `text-slate-400` / `text-gray-500`

export default function PageShell({ title, subtitle, icon: Icon, actions, children }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-hair/60 px-5 py-4">
        {Icon && (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[17px] font-bold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="truncate text-[12.5px] text-ink-mute">{subtitle}</p>}
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto p-5">{children}</div>
    </div>
  )
}

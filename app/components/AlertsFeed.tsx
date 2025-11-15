'use client'

interface AlertsFeedProps {
  alerts: any[]
  ships: any[]
  onSelectShip: (ship: any) => void
}

export default function AlertsFeed({ alerts, onSelectShip }: AlertsFeedProps) {
  return (
    <div className="w-96 bg-slate-800 border-r border-slate-700 p-4 overflow-y-auto">
      <h2 className="text-sm font-bold text-slate-300 mb-4">Alerts ({alerts.length})</h2>
      {alerts.map(alert => (
        <div key={alert.id} className="p-3 bg-slate-700 rounded mb-2 text-sm">
          <p className="font-semibold text-red-400">{alert.vessel_name}</p>
          <p className="text-slate-300">{alert.description}</p>
          <p className="text-xs text-slate-400 mt-1">{alert.risk_percentage}%</p>
        </div>
      ))}
    </div>
  )
}

'use client'

interface VesselAlert {
  id: string
  type: 'yellow' | 'red'
  message: string
  timestamp: string
  vesselName: string
  mmsi: number
  count: number
}

interface AlertsFeedProps {
  alerts: VesselAlert[]
  onClearAlerts: () => void
}

export default function AlertsFeed({ alerts, onClearAlerts }: AlertsFeedProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  return (
    <div className="w-96 bg-slate-800 border-r border-slate-700 p-4 overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-300">Alerts ({alerts.length})</h2>
        {alerts.length > 0 && (
          <button
            onClick={onClearAlerts}
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1">
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500 text-center mt-8">No alerts</p>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded mb-2 text-sm border-l-4 ${
                alert.type === 'red'
                  ? 'bg-red-900/20 border-red-500'
                  : 'bg-yellow-900/20 border-yellow-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      alert.type === 'red' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-yellow-500 text-black'
                    }`}>
                      {alert.count}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 text-xs">
                      <span className="font-medium">Vessel name:</span>{' '}
                      <span className={`font-semibold ${
                        alert.type === 'red' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {alert.vesselName}
                      </span>
                    </p>
                    <p className="text-slate-400 text-xs">
                      <span className="font-medium">MMSI:</span>{' '}
                      <span className="text-slate-300">{alert.mmsi}</span>
                    </p>
                    <p className="text-slate-300 mt-2 text-sm">{alert.message}</p>
                    {alert.type === 'yellow' && (
                      <p className="text-xs text-yellow-300 italic mt-1">
                        slow speed near cable structure
                      </p>
                    )}
                    {alert.type === 'red' && (
                      <p className="text-xs text-red-300 italic mt-1">
                        slow speed/ stalled on cable structure
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{formatTime(alert.timestamp)}</p>
                </div>
                <div className={`ml-2 w-3 h-3 rounded-full ${
                  alert.type === 'red' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

'use client'

interface VesselDetailsProps {
  ship: any
  onClose: () => void
}

export default function VesselDetails({ ship, onClose }: VesselDetailsProps) {
  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-bold">{ship.name}</h3>
        <button onClick={onClose} className="text-slate-400">✕</button>
      </div>
      <div className="space-y-3 text-sm">
        <div><span className="text-slate-400">MMSI:</span> {ship.mmsi}</div>
        <div><span className="text-slate-400">Flag:</span> {ship.flag}</div>
        <div><span className="text-slate-400">Risk:</span> <span className="font-bold text-red-400">{ship.risk_percentage}%</span></div>
        <div><span className="text-slate-400">Lat/Lng:</span> {ship.lat.toFixed(2)}°, {ship.long.toFixed(2)}°</div>
        <div><span className="text-slate-400">Speed:</span> {ship.velocity} knots</div>
      </div>
    </div>
  )
}

"use client"
import React, { useId, useRef, useEffect, useState } from 'react'

interface SparklineProps {
  data?: number[]
  width?: number
  height?: number
  changeHint?: number | undefined // optional externally supplied change value
  animate?: boolean
  delayMs?: number
}

export const Sparkline: React.FC<SparklineProps> = ({ data, width = 60, height = 24, changeHint, animate = true, delayMs = 0 }) => {
  if (!data || data.length < 2) return <div style={{ height, width }} className="sparkline-box" />
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1 // 1px horizontal padding
    const y = height - 1 - ((v - min) / range) * (height - 2) // 1px vertical padding
    return `${x},${y}`
  }).join(' ')
  const first = data[0]
  const last = data[data.length - 1]
  const delta = changeHint !== undefined ? changeHint : ((last - first) / first) * 100
  const up = delta > 0
  const flat = Math.abs(delta) < 0.01
  const stroke = flat ? '#c8a252' : up ? '#41c86f' : '#d45555'
  const fillStart = up ? 'rgba(65,200,111,0.35)' : flat ? 'rgba(200,162,82,0.35)' : 'rgba(212,85,85,0.35)'
  const fillEnd = up ? 'rgba(65,200,111,0)' : flat ? 'rgba(200,162,82,0)' : 'rgba(212,85,85,0)'
  const areaPath = (() => {
    const coords = points.split(' ')
    const firstPair = coords[0]
    const lastPair = coords[coords.length - 1]
    return `${'M'}${firstPair} L ${coords.join(' L ')} L ${lastPair.split(',')[0]},${height - 1} L ${firstPair.split(',')[0]},${height - 1} Z`
  })()
  const id = useId()
  const midY = height / 2
  const lineRef = useRef<SVGPolylineElement | null>(null)
  const areaRef = useRef<SVGPathElement | null>(null)
  const [len, setLen] = useState<number | null>(null)
  useEffect(()=>{
    if (!animate || !lineRef.current) return
    const length = (lineRef.current as any).getTotalLength ? (lineRef.current as any).getTotalLength() : null
    if (length) setLen(length)
  }, [animate, data])
  return (
    <div className="sparkline-box" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillStart} />
            <stop offset="100%" stopColor={fillEnd} />
          </linearGradient>
        </defs>
        <rect x={0.5} y={0.5} width={width - 1} height={height - 1} rx={4} ry={4} className="sparkline-bg" />
        <line x1={1} x2={width - 1} y1={midY} y2={midY} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 3" strokeWidth={1} />
        <path ref={areaRef} d={areaPath} fill={`url(#grad-${id})`} stroke="none" style={animate ? { opacity:0, animation:`sparkFade .6s ${0.15 + delayMs/1000}s forwards` } : undefined} />
        <polyline
          ref={lineRef}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={animate && len ? { strokeDasharray: len, strokeDashoffset: len, animation:`sparkDraw .7s ${delayMs/1000}s cubic-bezier(.4,.1,.2,1) forwards` } : undefined}
        />
      </svg>
    </div>
  )
}

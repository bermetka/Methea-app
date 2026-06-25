import React from 'react'
import type { FrameworkEdge } from '@/types/database'

export interface DiagramTheory {
  id: string
  name: string
  author: string
  year: number | null
}

interface Props {
  theories: DiagramTheory[]
  edges: FrameworkEdge[]
  layout: 'hierarchy' | 'hub-and-spoke' | 'linear'
  svgRef?: React.RefObject<SVGSVGElement>
}

type Point = { cx: number; cy: number }

const LAYOUTS: Record<'hierarchy' | 'hub-and-spoke' | 'linear', Record<number, Point[]>> = {
  linear: {
    2: [{ cx: 175, cy: 190 }, { cx: 525, cy: 190 }],
    3: [{ cx: 110, cy: 190 }, { cx: 350, cy: 190 }, { cx: 590, cy: 190 }],
    4: [{ cx: 85,  cy: 190 }, { cx: 268, cy: 190 }, { cx: 432, cy: 190 }, { cx: 615, cy: 190 }],
  },
  'hub-and-spoke': {
    2: [{ cx: 175, cy: 190 }, { cx: 525, cy: 190 }],
    3: [{ cx: 350, cy: 190 }, { cx: 110, cy: 95  }, { cx: 110, cy: 285 }],
    4: [{ cx: 350, cy: 190 }, { cx: 110, cy: 95  }, { cx: 110, cy: 285 }, { cx: 590, cy: 190 }],
  },
  hierarchy: {
    2: [{ cx: 175, cy: 120 }, { cx: 525, cy: 260 }],
    3: [{ cx: 350, cy: 70  }, { cx: 175, cy: 285 }, { cx: 525, cy: 285 }],
    4: [{ cx: 350, cy: 65  }, { cx: 140, cy: 200 }, { cx: 350, cy: 315 }, { cx: 560, cy: 200 }],
  },
}

const NODE_W = 180
const NODE_H = 56

function getEdgePoints(from: Point, to: Point) {
  const dx = to.cx - from.cx
  const dy = to.cy - from.cy
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / len
  const uy = dy / len
  const off = Math.abs(ux) * NODE_W / 2 + Math.abs(uy) * NODE_H / 2 + 6
  return {
    x1: from.cx + ux * off,
    y1: from.cy + uy * off,
    x2: to.cx   - ux * off,
    y2: to.cy   - uy * off,
  }
}

export default function FrameworkDiagram({ theories, edges, layout, svgRef }: Props) {
  const count = Math.min(Math.max(theories.length, 2), 4)
  const positions = LAYOUTS[layout][count] ?? LAYOUTS['hub-and-spoke'][count]

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 700 380"
      width="100%"
      style={{ display: 'block', maxWidth: '700px' }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Research framework diagram"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#DDD8C6" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((edge, i) => {
        const fromIdx = theories.findIndex(t => t.id === edge.from)
        const toIdx   = theories.findIndex(t => t.id === edge.to)
        if (fromIdx < 0 || toIdx < 0) return null
        const from = positions[fromIdx]
        const to   = positions[toIdx]
        if (!from || !to) return null
        const { x1, y1, x2, y2 } = getEdgePoints(from, to)
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        return (
          <g key={i}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#DDD8C6"
              strokeWidth="1.5"
              markerEnd="url(#arrow)"
            />
            {edge.label && (
              <text
                x={midX}
                y={midY - 6}
                textAnchor="middle"
                fontFamily="'Source Serif 4', Georgia, serif"
                fontStyle="italic"
                fontSize="11"
                fill="#8C8A82"
              >
                {edge.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {theories.slice(0, count).map((theory, i) => {
        const pos = positions[i]
        if (!pos) return null
        const x = pos.cx - NODE_W / 2
        const y = pos.cy - NODE_H / 2
        const name = theory.name.length > 22 ? theory.name.slice(0, 20) + '…' : theory.name
        const meta = `${theory.author.split(/[,&]/)[0].trim()}${theory.year ? `, ${theory.year}` : ''}`
        return (
          <g key={theory.id}>
            <rect
              x={x} y={y}
              width={NODE_W} height={NODE_H}
              rx="8"
              fill="#FBF9F3"
              stroke="#11425D"
              strokeWidth="1.5"
            />
            <text
              x={pos.cx} y={pos.cy - 8}
              textAnchor="middle"
              fontFamily="'Schibsted Grotesk', 'Inter', system-ui, sans-serif"
              fontWeight="600"
              fontSize="13"
              fill="#1C1C1C"
            >
              {name}
            </text>
            <text
              x={pos.cx} y={pos.cy + 12}
              textAnchor="middle"
              fontFamily="'Schibsted Grotesk', 'Inter', system-ui, sans-serif"
              fontSize="11"
              fill="#8C8A82"
            >
              {meta}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

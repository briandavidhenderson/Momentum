"use client"

import dynamic from 'next/dynamic'
import { forwardRef } from 'react'

// Dynamic import with no SSR, as force-graph uses window
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
    ssr: false,
    loading: () => <div>Loading specific graph kernel...</div>
})

export const ForceGraph3DWrapper = forwardRef((props: any, ref) => {
    return <ForceGraph3D {...props} ref={ref} />
})

ForceGraph3DWrapper.displayName = "ForceGraph3DWrapper"

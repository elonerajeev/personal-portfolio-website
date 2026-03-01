import './Skeleton.scss'
import React from 'react'

export const SkeletonText = ({lines = 3}) => (
    <div>
        {[...Array(lines)].map((_, i) => (
            <div key={i} className="skeleton-line" style={{width: i === lines - 1 ? '70%' : '100%'}}/>
        ))}
    </div>
)

export const SkeletonCircle = ({size = 80}) => (
    <div className="skeleton-circle" style={{width: size, height: size}}/>
)

export const SkeletonCard = () => (
    <div className="skeleton-card">
        <div className="skeleton-line" style={{height: 200, margin: 0}}/>
        <div className="skeleton-content">
            <SkeletonText lines={2}/>
        </div>
    </div>
)

export const SkeletonProfile = () => (
    <div className="skeleton-profile">
        <SkeletonCircle size={120}/>
        <div style={{flex: 1}}>
            <div className="skeleton-line" style={{width: 200, height: 24, marginBottom: 12}}/>
            <div className="skeleton-line" style={{width: 150, height: 16}}/>
        </div>
    </div>
)

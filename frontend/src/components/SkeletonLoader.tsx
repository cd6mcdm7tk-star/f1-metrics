import React from 'react';

export const SkeletonCard = () => (
  <div className="card-cockpit animate-pulse">
    <div className="h-6 bg-metrik-turquoise/20 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-metrik-silver/10 rounded w-full"></div>
      <div className="h-4 bg-metrik-silver/10 rounded w-5/6"></div>
      <div className="h-4 bg-metrik-silver/10 rounded w-4/6"></div>
    </div>
  </div>
);

export const SkeletonStat = () => (
  <div className="card-cockpit text-center animate-pulse">
    <div className="h-3 bg-metrik-turquoise/20 rounded w-2/3 mx-auto mb-2"></div>
    <div className="h-8 bg-metrik-turquoise/30 rounded w-1/2 mx-auto"></div>
  </div>
);

export const SkeletonChart = () => (
  <div className="card-cockpit animate-pulse">
    <div className="h-6 bg-metrik-turquoise/20 rounded w-1/4 mb-4"></div>
    <div className="h-64 bg-metrik-dark rounded-lg border border-metrik-turquoise/10 flex items-end justify-around p-4 gap-2">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="bg-metrik-turquoise/20 rounded-t w-full"
          style={{ height: `${Math.random() * 100}%` }}
        ></div>
      ))}
    </div>
  </div>
);

export const SkeletonCanvas = () => (
  <div className="card-cockpit animate-pulse">
    <div className="h-6 bg-metrik-turquoise/20 rounded w-1/4 mb-4"></div>
    <div className="h-96 bg-metrik-black rounded-lg border border-metrik-turquoise/10 flex items-center justify-center">
      <div className="w-64 h-64 border-4 border-metrik-turquoise/20 rounded-full animate-spin border-t-metrik-turquoise"></div>
    </div>
  </div>
);

export const SkeletonDropdown = () => (
  <div className="animate-pulse">
    <div className="h-3 bg-metrik-turquoise/20 rounded w-1/3 mb-2"></div>
    <div className="h-12 bg-metrik-dark border border-metrik-turquoise/20 rounded-lg"></div>
  </div>
);

export const SkeletonButton = () => (
  <div className="animate-pulse">
    <div className="h-3 bg-metrik-turquoise/20 rounded w-1/3 mb-2"></div>
    <div className="h-12 bg-metrik-turquoise/20 rounded-lg"></div>
  </div>
);
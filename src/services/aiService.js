const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export const analyzeBeautyProfile = async (profile) => {
  await delay(3200)
  const hairstyles =
    profile.hairType === 'curly'   ? ['Layered Curls', 'Defined Ringlets', 'Curly Bob'] :
    profile.hairType === 'wavy'    ? ['Beach Waves', 'Textured Lob', 'Soft Layers'] :
                                     ['Sleek Straight', 'Blunt Bob', 'Silky Layers']
  const treatments =
    profile.skinConcern === 'dry'       ? ['Hydrating Facial', 'Moisture Boost', 'Oil Infusion Mask'] :
    profile.skinConcern === 'oily'      ? ['Deep Cleansing Facial', 'Clay Mask', 'Sebum Control'] :
    profile.skinConcern === 'sensitive' ? ['Calming Facial', 'Aloe Treatment', 'Gentle Exfoliation'] :
                                          ['Balancing Facial', 'Niacinamide Treatment', 'Combination Care']
  return {
    faceShape: 'Oval',
    skinTone: 'Medium Warm',
    hairstyles,
    treatments,
    beautyTips: [
      'Use a silk pillowcase to reduce hair breakage overnight',
      'Apply SPF 50 every morning — even on Mumbai monsoon days',
      'Double-cleanse at night to remove humidity and pollution',
    ],
    salonMatches: [1, 4, 2],
    budgetCategory: profile.budget > 5000 ? 'Premium' : profile.budget > 2000 ? 'Mid-Range' : 'Value',
  }
}

export const generateBridalTimeline = async (weddingDate, budget, style) => {
  await delay(2000)
  return {
    timeline: [
      {
        phase: '3 Months Before', icon: '✦',
        tasks: [
          { task: 'Book bridal makeup artist',           priority: 'High',   done: false },
          { task: 'Start pre-bridal skincare routine',   priority: 'High',   done: false },
          { task: 'Hair consultation & treatment plan',  priority: 'Medium', done: false },
          { task: 'Begin mehndi artist search',          priority: 'Medium', done: false },
        ],
      },
      {
        phase: '2 Months Before', icon: '✦',
        tasks: [
          { task: 'Bridal makeup trial session',       priority: 'High',   done: false },
          { task: 'Deep conditioning hair treatment',  priority: 'High',   done: false },
          { task: 'Eyebrow shaping & tinting',         priority: 'Medium', done: false },
          { task: 'Finalise bridal look',              priority: 'High',   done: false },
        ],
      },
      {
        phase: '1 Month Before', icon: '✦',
        tasks: [
          { task: 'Pre-bridal facial series (3 sessions)', priority: 'High',   done: false },
          { task: 'Book nail artist for bridal nails',     priority: 'High',   done: false },
          { task: 'Final bridal makeup rehearsal',         priority: 'High',   done: false },
          { task: 'Body polishing treatment',              priority: 'Medium', done: false },
        ],
      },
      {
        phase: 'Wedding Week', icon: '♦',
        tasks: [
          { task: 'Final skin brightening facial', priority: 'High', done: false },
          { task: 'Bridal mehendi appointment',   priority: 'High', done: false },
          { task: 'Hair treatment & trim',        priority: 'High', done: false },
          { task: 'Manicure & Pedicure',          priority: 'High', done: false },
        ],
      },
    ],
    estimatedBudget: budget,
    style,
  }
}

export const optimizeBudget = async (budget, location, services) => {
  await delay(1600)
  return [
    {
      name: 'Essential Glow',
      salon: 'Aura Salon Powai', salonId: 3,
      services: services.slice(0, 2),
      originalPrice: Math.round(budget * 1.2),
      optimizedPrice: Math.round(budget * 0.82),
      savings: Math.round(budget * 0.38),
      valueScore: 92, rating: 4.7, bestFor: 'Everyday Beauty',
    },
    {
      name: 'Premium Experience',
      salon: 'Luxe Studio Bandra', salonId: 1,
      services,
      originalPrice: Math.round(budget * 1.5),
      optimizedPrice: Math.round(budget * 0.94),
      savings: Math.round(budget * 0.56),
      valueScore: 97, rating: 4.9, bestFor: 'Special Occasion',
    },
    {
      name: 'Luxury Splurge',
      salon: 'The Glam Room Juhu', salonId: 4,
      services: [...services, 'Luxury Add-On'],
      originalPrice: Math.round(budget * 2),
      optimizedPrice: Math.round(budget * 1.1),
      savings: Math.round(budget * 0.9),
      valueScore: 89, rating: 4.9, bestFor: 'Premium Indulgence',
    },
  ]
}
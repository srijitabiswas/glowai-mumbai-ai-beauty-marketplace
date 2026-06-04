import { Star } from 'lucide-react'

export default function TestimonialCard({ testimonial }) {
  return (
    <div className="card-luxury p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => <Star key={i} size={13} className="text-glow-gold fill-glow-gold" />)}
      </div>
      <p className="font-playfair text-base italic text-glow-black/80 leading-relaxed flex-1">
        "{testimonial.review}"
      </p>
      <div className="flex items-center gap-3 pt-3 border-t border-glow-border">
        <img src={testimonial.avatar} alt={testimonial.name} className="w-10 h-10 rounded-full object-cover" />
        <div>
          <p className="font-inter text-sm font-semibold text-glow-black">{testimonial.name}</p>
          <p className="font-inter text-xs text-glow-muted">{testimonial.role}</p>
        </div>
      </div>
    </div>
  )
}
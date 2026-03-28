import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

function FallbackImg({ name, className }) {
  return (
    <div
      className={`bg-warm-dark flex flex-col items-center justify-center gap-2 ${className || ""}`}
    >
      <div className="text-3xl opacity-25">□</div>
      <div className="text-[10px] text-muted text-center px-3 leading-relaxed">
        {name}
      </div>
    </div>
  );
}

function SafeImg({ src, alt, className }) {
  const [err, setErr] = useState(false);
  if (!src || err)
    return <FallbackImg name={alt} className={className} />;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setErr(true)}
      loading="lazy"
    />
  );
}

export { SafeImg };

export default function ImageGallery({ images, name }) {
  if (!images || images.length === 0) {
    return <FallbackImg name={name} className="w-full aspect-square" />;
  }

  if (images.length === 1) {
    return (
      <SafeImg
        src={images[0]}
        alt={name}
        className="w-full aspect-square object-cover"
      />
    );
  }

  return (
    <Swiper
      modules={[Pagination]}
      pagination={{ clickable: true }}
      className="w-full aspect-square"
      loop={images.length > 1}
    >
      {images.map((img, i) => (
        <SwiperSlide key={i}>
          <SafeImg
            src={img}
            alt={`${name} ${i + 1}`}
            className="w-full h-full object-cover"
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

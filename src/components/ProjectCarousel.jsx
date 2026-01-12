'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ProjectCard from './ProjectCard';
import Icon from './Icon';

const ProjectCarousel = ({ projects = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemsPerSlide, setItemsPerSlide] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef(null);
  const autoplayRef = useRef(null);

  // Determine items per slide based on viewport
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setItemsPerSlide(3);
      } else {
        setItemsPerSlide(1);
      }
    };

    // Initial call
    handleResize();

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const totalSlides = Math.ceil(projects.length / itemsPerSlide);

  // Navigation handlers
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Autoplay logic
  useEffect(() => {
    if (isPaused) return;

    autoplayRef.current = setInterval(() => {
      nextSlide();
    }, 15000); // 15s interval

    return () => clearInterval(autoplayRef.current);
  }, [isPaused, nextSlide]);

  return (
    <div
      className="carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="carousel-track-container">
        <div
          className="carousel-track"
          ref={trackRef}
          style={{
            display: 'flex',
            transform: `translateX(-${currentSlide * 100}%)`,
            transition: 'transform 0.5s ease-in-out',
          }}
        >
          {/* Create slides */}
          {Array.from({ length: totalSlides }).map((_, slideIndex) => {
            const startIndex = slideIndex * itemsPerSlide;
            const slideItems = projects.slice(
              startIndex,
              startIndex + itemsPerSlide
            );

            return (
              <div
                key={slideIndex}
                className={`carousel-slide ${
                  slideIndex === currentSlide ? 'active' : ''
                }`}
                style={{
                  flex: '0 0 100%',
                  display: 'flex',
                  gap: '24px',
                  justifyContent: 'center',
                }}
              >
                {slideItems.map((project) => (
                  <div
                    key={project.repoName || project.title}
                    style={{
                      flex: itemsPerSlide === 1 ? '0 0 100%' : '0 0 400px',
                      maxWidth: '400px',
                      width: '100%',
                    }}
                  >
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {totalSlides > 1 && (
        <div className="carousel-controls-container">
          <div className="carousel-controls">
            <button
              className="carousel-button prev"
              onClick={prevSlide}
              aria-label="Previous slide"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path fill="none" d="M0 0h24v24H0z" />
                <path
                  fill="currentColor"
                  d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                />
              </svg>
            </button>
            <button
              className="carousel-button next"
              onClick={nextSlide}
              aria-label="Next slide"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path fill="none" d="M0 0h24v24H0z" />
                <path
                  fill="currentColor"
                  d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
                />
              </svg>
            </button>
          </div>

          <div className="carousel-pagination">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <div
                key={index}
                className={`carousel-dot ${
                  index === currentSlide ? 'active' : ''
                }`}
                onClick={() => goToSlide(index)}
                role="button"
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCarousel;

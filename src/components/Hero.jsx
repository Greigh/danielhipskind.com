import Image from 'next/image';

const Hero = () => {
  return (
    <section id="hero">
      <div className="hero-content">
        <div className="hero-image-container">
          {/* Using Next.js Image for optimization, but keeping structure similar */}
          <Image
            src="/assets/images/DanielPortfolio.jpeg"
            alt="Daniel Hipskind"
            className="hero-img"
            width={150}
            height={150}
            priority
            style={{ width: 'auto', height: 'auto' }} // Preserve aspect ratio
          />
        </div>
        <h1>Daniel Hipskind</h1>
        <p>Software Engineer</p>
      </div>
    </section>
  );
};

export default Hero;

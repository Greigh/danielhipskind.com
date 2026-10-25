import Image from "next/image";

const Hero = () => {
  return (
    <section id="hero">
      <div className="hero-content">
        <div className="hero-image-container">
          {/* Using Next.js Image for optimization, but keeping structure similar */}
          <Image
            src="/assets/images/DanielPortfolio.webp"
            alt="Portrait of Daniel Hipskind"
            className="hero-img"
            width={190}
            height={190}
            priority
          />
        </div>
        <h1>Daniel Hipskind</h1>
        <p>Software Engineer · Founder of Greigh Studios LLC</p>
      </div>
    </section>
  );
};

export default Hero;

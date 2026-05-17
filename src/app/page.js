import Hero from '@/components/Hero';
import About from '@/components/About';
import Projects from '@/components/Projects';
import Skills from '@/components/Skills';
import ScrollReveal from '@/components/ScrollReveal';

export default function Home() {
  return (
    <main>
      <Hero />
      <ScrollReveal>
        <About />
      </ScrollReveal>
      <ScrollReveal>
        <Projects />
      </ScrollReveal>
      <ScrollReveal>
        <Skills />
      </ScrollReveal>
    </main>
  );
}

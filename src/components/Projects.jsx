import { fetchGitHubData } from '@/lib/github';
import { manualProjects } from '@/data/content';
import ProjectCarousel from './ProjectCarousel';

const Projects = async () => {
  const githubProjects = await fetchGitHubData();
  const allProjects = [...manualProjects, ...githubProjects];

  return (
    <section id="projects">
      <h2>Projects</h2>
      <ProjectCarousel projects={allProjects} />
    </section>
  );
};

export default Projects;

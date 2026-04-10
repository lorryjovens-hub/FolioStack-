import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import { Palette, Terminal, Video, Cpu, Database, Layout } from "lucide-react";

export function Skills() {
  const skillCategories = [
    {
      title: "AI 设计 & 创作",
      icon: Palette,
      skills: [
        "Midjourney", "Stable Diffusion", "Runway", "Figma AI", "Prompt Engineering", 
        "Adobe Firefly", "ComfyUI", "ControlNet"
      ],
      color: "text-pink-400",
      bg: "bg-pink-400/10",
      border: "border-pink-400/20"
    },
    {
      title: "全栈开发",
      icon: Terminal,
      skills: [
        "React", "Vue.js", "TypeScript", "Tailwind CSS", "Python", "Node.js", 
        "Flask/FastAPI", "Docker"
      ],
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
      border: "border-cyan-400/20"
    },
    {
      title: "AI & 数据技术",
      icon: Cpu,
      skills: [
        "PyTorch", "TensorFlow", "Hugging Face", "LangChain", "RAG", 
        "OpenCV", "Computer Vision", "NLP"
      ],
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-purple-400/20"
    },
    {
      title: "影视 & 视觉",
      icon: Video,
      skills: [
        "Premiere Pro", "After Effects", "DaVinci Resolve", "Photoshop", 
        "Blender", "Videography", "Script Writing"
      ],
      color: "text-orange-400",
      bg: "bg-orange-400/10",
      border: "border-orange-400/20"
    }
  ];

  return (
    <section id="skills" className="py-20 bg-slate-900 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">核心 <span className="text-cyan-400">技能</span></h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            跨越创意设计与硬核技术的技能组合，赋能 AIGC 全流程创作
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {skillCategories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-2xl p-6 border ${category.border} bg-slate-950/50 hover:bg-slate-950 transition-colors`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-lg ${category.bg} flex items-center justify-center ${category.color}`}>
                  <category.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-200">{category.title}</h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

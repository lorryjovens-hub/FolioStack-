import { motion } from "motion/react";
import { Briefcase, Calendar, Award } from "lucide-react";

export function Experience() {
  const experiences = [
    {
      company: "深圳堡得家办科技有限公司",
      role: "AI 设计与内容创作主管",
      period: "2023.12 - 至今",
      description: "建立 AIGC 内容创作流程，使用 Midjourney 和 Stable Diffusion 生成高端商业访谈栏目视觉素材。设计 AI 辅助的内容分发策略，统筹董事长个人 IP 的 AI 数字化建设。开发 AI 视频剪辑自动化工具，提升后期效率 40%。",
      achievements: ["作品以 8400 万港元拍卖成功", "开发 AI 内容管理系统", "构建多平台内容矩阵"]
    },
    {
      company: "深圳市苫也文旅发展有限公司",
      role: "AI 视觉设计师",
      period: "2023.06 - 2023.12",
      description: "使用 Figma AI 和 Adobe Firefly 设计民宿品牌视觉系统。开发 AI 生成的个性化民宿宣传素材。建立 AI 驱动的视觉内容库。",
      achievements: ["客流增长 35%", "设计效率提升 50%", "AI 辅助摄影 100 余单"]
    },
    {
      company: "深圳智牛传媒有限公司",
      role: "AI 视频技术工程师",
      period: "2021.12 - 2022.12",
      description: "开发 AI 视频剪辑自动化工具，支持批量处理和智能剪辑。集成 Stable Diffusion 实现视频内容的 AI 增强和修复。",
      achievements: ["营收突破 100 万元", "建立 AI 视频技术标准", "获得调色师资格"]
    }
  ];

  return (
    <section id="experience" className="py-20 bg-slate-950 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">工作 <span className="text-cyan-400">经历</span></h2>
        </motion.div>

        <div className="max-w-4xl mx-auto relative">
          {/* Vertical Line */}
          <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 top-0 bottom-0 w-px bg-slate-800"></div>

          {experiences.map((exp, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex flex-col md:flex-row gap-8 mb-12 md:mb-16 ${
                index % 2 === 0 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Timeline Dot */}
              <div className="absolute left-0 md:left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-cyan-500 border-4 border-slate-950 z-10 mt-1.5 md:mt-8"></div>

              {/* Content */}
              <div className="ml-8 md:ml-0 md:w-1/2 px-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{exp.company}</h3>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-900">{exp.period}</span>
                  </div>
                  <div className="text-purple-400 font-medium mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {exp.role}
                  </div>
                  <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                    {exp.description}
                  </p>
                  
                  <div className="space-y-2">
                    {exp.achievements.map((achieve, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                        <Award className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <span>{achieve}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Empty side for layout balance */}
              <div className="hidden md:block md:w-1/2"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

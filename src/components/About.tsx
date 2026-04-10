import { motion } from "motion/react";
import { User, MapPin, Mail, GraduationCap, Target } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import profileImage from "figma:asset/bc644c078a7c2d9f92acf16e3731ed57471d2757.png";

export function About() {
  return (
    <section id="about" className="py-20 bg-slate-950 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            关于 <span className="text-cyan-400">我</span>
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-purple-600 mx-auto rounded-full"></div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-2xl overflow-hidden relative z-10 border border-slate-800 bg-slate-900 group">
              {/* Placeholder for user image, using an abstract tech persona or the provided one if available */}
               <img
                src={profileImage}
                alt="Huang Junhua"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 grayscale hover:grayscale-0"
              />
              
              {/* Overlay Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-6 pt-20">
                <h3 className="text-2xl font-bold text-white">黄俊华</h3>
                <p className="text-cyan-400 font-medium">AI 全栈工程师 / 设计师</p>
              </div>
            </div>
            
            {/* Decorative Backdrops */}
            <div className="absolute top-4 -right-4 w-full h-full rounded-2xl border border-cyan-500/30 -z-10"></div>
            <div className="absolute -top-4 -left-4 w-full h-full rounded-2xl border border-purple-500/30 -z-10"></div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold mb-6 text-slate-100">
              融合设计美学与技术实现的
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                综合型 AIGC 创作者
              </span>
            </h3>
            
            <p className="text-slate-400 mb-6 leading-relaxed">
              作为一名融合了设计美学和技术实现的 AI 全栈工程师，我具备从创意构想到技术实现的完整能力。
              在过去的工作中，我成功将 AIGC 技术应用于多个商业项目，实现了设计效率和创意质量的双重提升。
            </p>
            
            <p className="text-slate-400 mb-8 leading-relaxed">
              我精通 Figma AI、Midjourney、Stable Diffusion 等 AI 设计工具，同时拥有扎实的前端和后端开发技能，
              能够独立完成 AI 产品的全栈开发。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: User, label: "年龄", value: "25 岁" },
                { icon: MapPin, label: "坐标", value: "深圳" },
                { icon: GraduationCap, label: "学历", value: "本科 · 广播影视设计" },
                { icon: Target, label: "求职", value: "AI 设计师 / 全栈工程师" },
              ].map((item, idx) => (
                <Card key={idx} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">{item.label}</div>
                      <div className="font-medium text-slate-200">{item.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

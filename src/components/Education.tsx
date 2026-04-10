import { motion } from "motion/react";
import { Award, Book, ShieldCheck } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import certImage from "figma:asset/4e05ef96422bd8e4d8ebfe0586c7a98b3850ccbe.png";

export function Education() {
  return (
    <section className="py-20 bg-slate-950 relative">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Education */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Book className="w-6 h-6 text-cyan-400" />
              教育背景
            </h3>
            
            <div className="relative pl-8 border-l border-slate-800 space-y-8">
              <div className="relative">
                <div className="absolute -left-[37px] top-1 w-4 h-4 rounded-full bg-slate-950 border-2 border-cyan-500"></div>
                <h4 className="text-xl font-bold text-white">深圳信息职业技术大学</h4>
                <p className="text-purple-400">广播影视设计与制作 | 本科</p>
                <p className="text-slate-500 text-sm mt-1">2020 - 2023</p>
                <ul className="mt-4 space-y-2 text-slate-400 text-sm">
                  <li className="text-left font-bold font-normal">• 深度学习和神经网络基础、计算机视觉和图像处理技术、影视拍摄制作</li>
                  <li>• 开发 AI 辅助的影视制作系统</li>
                  <li>• 获得学校摄影大赛奖学金、华为技术创新奖</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Certifications */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              技术认证
            </h3>

            <div className="grid gap-4">
              {[
                { title: "Figma AI 专业认证", type: "AI Design", hasImage: false },
                { title: "Adobe Firefly 认证", type: "AI Design", hasImage: false },
                { title: "DaVinci Resolve 调色师认证", type: "Video", hasImage: true },
                { title: "Python AI 工程师认证", type: "Development", hasImage: false },
                { title: "TensorFlow 开发者认证", type: "AI Dev", hasImage: false },
                { title: "AWS Cloud Practitioner", type: "Cloud", hasImage: false }
              ].map((cert, index) => (
                <div 
                  key={index}
                  className={`bg-slate-900 border border-slate-800 rounded-xl hover:border-purple-500/50 transition-colors overflow-hidden ${
                    cert.hasImage ? 'p-0' : 'p-4'
                  }`}
                >
                  {cert.hasImage ? (
                    <div className="space-y-3">
                      <div className="p-4 pb-0 flex items-center justify-between text-[rgb(47,135,221)] font-bold">
                        <span className="font-medium text-slate-200">{cert.title}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400">{cert.type}</span>
                      </div>
                      <div className="px-4 pb-4">
                        <div className="rounded-lg overflow-hidden border border-slate-700">
                          <ImageWithFallback
                            src={certImage}
                            alt="DaVinci Resolve 18 调色师认证证书"
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[rgb(47,135,221)] font-bold">
                      <span className="font-medium text-slate-200">{cert.title}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400">{cert.type}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
import { motion } from "motion/react";
import { ArrowRight, Code, Cpu, Video, Zap } from "lucide-react";
import { Button } from "./ui/button";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639628739763-3d4ada1a656a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGFydGlmaWNpYWwlMjBpbnRlbGxpZ2VuY2UlMjBjeWJlciUyMHRlY2hub2xvZ3klMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwxfHx8fDE3NjQ0NDA1NjF8MA&ixlib=rb-4.1.0&q=80&w=1080')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-900/50 backdrop-blur-sm mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-300">Available for work</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="block text-slate-100 mb-2">黄俊华</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
              AI Creative Engineer
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            AIGC 创作 / AI 全栈开发 / 数字化设计
            <br />
            致力于将人工智能技术融入创意设计与内容创作
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              className="bg-cyan-600 hover:bg-cyan-700 text-white border-0 shadow-[0_0_20px_-5px_rgba(8,145,178,0.5)] group"
              onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
            >
              浏览作品
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              联系我
            </Button>
          </div>

          {/* Floating stats or icons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-800/50 pt-10">
            {[
              { icon: Cpu, label: "AI Engineering", value: "Midjourney / SD" },
              { icon: Code, label: "Full Stack", value: "React / Python" },
              { icon: Video, label: "Video Production", value: "AIGC Director" },
              { icon: Zap, label: "Experience", value: "2 Years+" },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="text-center p-4 rounded-2xl hover:bg-slate-900/50 transition-colors"
              >
                <div className="mx-auto w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center mb-3 text-cyan-400 border border-slate-800">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-sm text-slate-500 mb-1">{item.label}</div>
                <div className="font-semibold text-slate-200">{item.value}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

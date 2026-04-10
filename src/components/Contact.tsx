import { motion } from "motion/react";
import { Mail, Linkedin, Github, MessageSquare } from "lucide-react";
import { Button } from "./ui/button";

export function Contact() {
  return (
    <section id="contact" className="py-20 bg-slate-900 border-t border-slate-800">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-8 md:p-12 rounded-3xl relative overflow-hidden"
        >
          {/* Decorative background glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            准备好开始 <span className="text-purple-400">下一个项目</span> 了吗？
          </h2>
          
          <p className="text-slate-400 mb-10 text-lg">
            我正在寻找 AI 设计师、AIGC 创作工程师或 AI 全栈工程师的机会。
            <br className="hidden md:block" />
            如果您有相关的职位或合作意向，欢迎随时联系我。
          </p>

          <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-10">
            <div className="flex items-center gap-3 text-slate-300 bg-slate-800/50 px-6 py-3 rounded-xl border border-slate-700">
              <MessageSquare className="w-5 h-5 text-green-500" />
              <span className="font-mono">WeChat: hjh2574566046</span>
            </div>
            
            <div className="flex items-center gap-3 text-slate-300 bg-slate-800/50 px-6 py-3 rounded-xl border border-slate-700">
              <Mail className="w-5 h-5 text-blue-500" />
              <span className="font-mono">2574566046@qq.com</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button 
              size="lg"
              className="bg-white text-slate-950 hover:bg-slate-200"
              onClick={() => window.location.href = 'mailto:2574566046@qq.com'}
            >
              发送邮件
            </Button>
          </div>
        </motion.div>
        
        <footer className="mt-20 text-slate-600 text-sm">
          <p>© 2025 黄俊华. All rights reserved.</p>
          <p className="mt-2">Designed & Built with AI Power</p>
        </footer>
      </div>
    </section>
  );
}

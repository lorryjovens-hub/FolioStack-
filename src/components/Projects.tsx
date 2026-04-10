import { motion } from "motion/react";
import { ExternalLink, Code, Film, Camera, Play, Image as ImageIcon, Layers, Scan } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import studioImage from "figma:asset/957335a374aa14f6f06365afd5bd608ea180f4a5.png";
import conferenceImage from "figma:asset/6d3e621d5fadf5bec94d36136f9a93c1cdd4761a.png";

// Import QR Code Images
import wechatQr from "figma:asset/ab40f4c2b1b28265d0b0158ca1ab4fc34b4e4458.png";
import bilibiliQr from "figma:asset/90895f29784ba56aca7a98831e3a42c49990be89.png";
import douyinQr from "figma:asset/37a164e1f3b945860fe3f1505ed92c6db230668e.png";

export function Projects() {
  const projects = [
    {
      title: "AI 设计周项目",
      role: "AI 导演 / 技术总监",
      category: "video",
      categoryLabel: "AI Video",
      image: "https://images.unsplash.com/photo-1571917687771-094c2a557ed4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwc3RhZ2UlMjBkZXNpZ24lMjBjb25jZXJ0JTIwbGlnaHQlMjBzaG93JTIwYWklMjBhcnQlMjBpbnN0YWxsYXRpb258ZW58MXx8fHwxNzY0NDQyNjg4fDA&ixlib=rb-4.1.0&q=80&w=1080",
      description: "负责深圳设计周 AI 技术应用。设计 AI 驱动的内容创作流程，拍摄《星星》自闭症儿童纪录片，实现 AI 驱动的舞台设计。",
      tags: ["AIGC", "Stage Design", "Figma AI", "Documentary"],
      icon: Film,
      videoUrl: "https://www.youtube.com/embed/LXb3EKWsInQ" // Placeholder tech/art video
    },
    {
      title: "AI 摄影工作室",
      role: "创始人 / 技术负责人",
      category: "design",
      categoryLabel: "Startup & Tech",
      image: studioImage,
      description: "建立 AI 辅助的摄影和视频制作工作室。开发 AI 摄影辅助系统，为智己汽车、咕噜科技等提供 AI 营销内容。",
      tags: ["Computer Vision", "Photography", "AI Tools", "Business"],
      icon: Camera,
      videoUrl: null
    },
    {
      title: "华为大会 AI 支持",
      role: "AI 技术志愿者",
      category: "tech",
      categoryLabel: "AI Engineering",
      image: conferenceImage,
      description: "参与华为中国合作伙伴大会。集成 OpenCV 实现实时人脸识别，开发 AI 会议纪要系统。",
      tags: ["OpenCV", "Real-time Analysis", "NLP", "Meeting Assistant"],
      icon: Code,
      videoUrl: null
    }
  ];

  const tabs = [
    { value: "all", label: "全部作品" },
    { value: "video", label: "AI 视频" },
    { value: "design", label: "视觉设计" },
    { value: "tech", label: "技术开发" }
  ];

  const filterProjects = (tabValue: string) => {
    if (tabValue === "all") return projects;
    if (tabValue === "design") return projects.filter(p => p.category === "design");
    if (tabValue === "video") return projects.filter(p => p.category === "video");
    if (tabValue === "tech") return projects.filter(p => p.category === "tech");
    return projects;
  };

  return (
    <section id="projects" className="py-20 bg-slate-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">精选 <span className="text-cyan-400">项目</span></h2>
          <p className="text-slate-400">技术与艺术的完美融合</p>
        </motion.div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <TabsList className="bg-slate-950 border border-slate-800 p-1 h-auto rounded-full">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="rounded-full px-6 py-2 text-slate-400 data-[state=active]:bg-cyan-600 data-[state=active]:text-white transition-all"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300">
                  <Scan className="w-4 h-4" />
                  扫码观看更多作品
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-800 max-w-3xl p-8">
                <DialogTitle className="text-xl font-bold text-white mb-6 text-center">
                  扫码关注我的 <span className="text-cyan-400">自媒体频道</span>
                </DialogTitle>
                <DialogDescription className="text-center text-slate-400 mb-8">
                  关注我的视频号、B站和抖音，获取更多 AI 创作与幕后花絮
                </DialogDescription>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* WeChat Channels */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-2 rounded-xl w-full aspect-square flex items-center justify-center">
                      <img src={wechatQr} alt="Video Accounts QR" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-white font-bold">视频号</h4>
                      <p className="text-slate-500 text-sm">短片导演 lorry</p>
                    </div>
                  </div>

                  {/* Bilibili */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-2 rounded-xl w-full aspect-square flex items-center justify-center">
                      <img src={bilibiliQr} alt="Bilibili QR" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-white font-bold">Bilibili</h4>
                      <p className="text-slate-500 text-sm">俊华 lorry</p>
                    </div>
                  </div>

                  {/* Douyin */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-2 rounded-xl w-full aspect-square flex items-center justify-center">
                      <img src={douyinQr} alt="Douyin QR" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-white font-bold">抖音</h4>
                      <p className="text-slate-500 text-sm">爱摄影的 Lorry</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
               <div className="grid md:grid-cols-3 gap-8">
                {filterProjects(tab.value).map((project, index) => (
                  <motion.div
                    key={`${tab.value}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Dialog>
                      <Card className="bg-slate-950 border-slate-800 overflow-hidden hover:border-cyan-500/50 transition-all hover:-translate-y-2 h-full flex flex-col group relative">
                        <div className="relative h-56 overflow-hidden">
                          <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/40 transition-colors z-10"></div>
                          <img 
                            src={project.image} 
                            alt={project.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute top-4 left-4 z-20">
                            <Badge className="bg-black/60 backdrop-blur text-white border-0 hover:bg-black/80">
                              {project.categoryLabel}
                            </Badge>
                          </div>
                          
                          {/* Video Play Button Overlay */}
                          {project.videoUrl && (
                             <DialogTrigger asChild>
                                <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                                  <div className="w-16 h-16 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-110 transition-transform">
                                    <Play className="w-6 h-6 fill-current ml-1" />
                                  </div>
                                </div>
                             </DialogTrigger>
                          )}
                        </div>
                        
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">{project.title}</h3>
                              <p className="text-sm text-purple-400 font-medium mt-1">{project.role}</p>
                            </div>
                            <project.icon className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                          </div>
                        </CardHeader>
                        
                        <CardContent className="flex-grow">
                          <p className="text-slate-400 text-sm leading-relaxed">
                            {project.description}
                          </p>
                        </CardContent>
                        
                        <CardFooter className="flex flex-wrap gap-2 mt-auto pt-0">
                          {project.tags.map((tag, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 rounded bg-slate-900 text-slate-500 border border-slate-800">
                              {tag}
                            </span>
                          ))}
                        </CardFooter>
                      </Card>

                      {/* Video Dialog Content */}
                      {project.videoUrl && (
                        <DialogContent className="bg-slate-950 border-slate-800 max-w-4xl p-0 overflow-hidden">
                           <DialogTitle className="sr-only">{project.title} Video</DialogTitle>
                           <DialogDescription className="sr-only">Video demonstration of {project.title}</DialogDescription>
                          <div className="aspect-video w-full bg-black relative">
                            <iframe 
                              width="100%" 
                              height="100%" 
                              src={project.videoUrl} 
                              title={project.title}
                              frameBorder="0" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                              allowFullScreen
                            ></iframe>
                          </div>
                          <div className="p-6">
                            <h3 className="text-2xl font-bold text-white mb-2">{project.title}</h3>
                            <p className="text-slate-400">{project.description}</p>
                          </div>
                        </DialogContent>
                      )}
                    </Dialog>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

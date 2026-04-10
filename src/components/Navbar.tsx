import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { Button } from "./ui/button";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "关于", href: "#about" },
    { name: "技能", href: "#skills" },
    { name: "经历", href: "#experience" },
    { name: "项目", href: "#projects" },
    { name: "联系", href: "#contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <a href="#" className="text-2xl font-bold tracking-tighter flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-slate-950 rounded-full p-1 border border-slate-800">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:from-cyan-300 group-hover:to-purple-400 transition-all duration-300">
            HJH.AI
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
          <Button
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300"
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
          >
            合作咨询
          </Button>
        </div>

        {/* Mobile Nav Toggle */}
        <button
          className="md:hidden text-slate-300 hover:text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-slate-950 border-b border-slate-800 overflow-hidden"
        >
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-slate-300 hover:text-cyan-400 py-2 block"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}

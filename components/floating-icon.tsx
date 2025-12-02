import { motion } from "framer-motion";


const FloatingIcon = ({ Icon, color, label, offset, index, isRightSide = false }: {
    Icon: any; color: string; label: string; offset: boolean; index: number; isRightSide?: boolean;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
            delay: 0.6 + index * 0.15,
            type: "spring",
            stiffness: 110,
            damping: 16,
        }}
        whileHover={{
            scale: 1.3,
            y: -16,
            rotate: isRightSide
                ? (index % 2 === 0 ? [0, -12, 12, 0] : [0, 12, -12, 0])
                : (index % 2 === 0 ? [0, 12, -12, 0] : [0, -12, 12, 0]),
            transition: { duration: 0.5 },
        }}
        className={`flex flex-col items-center gap-3 ${offset ? (isRightSide ? "lg:pr-40" : "lg:pl-40") : ""
            }`}
    >
        <motion.div
            animate={{ y: [0, -18, 0] }}
            transition={{
                duration: 4.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.35,
            }}
            className={`w-14 h-14 ${color} rounded-full shadow-2xl flex items-center justify-center border-4 border-white/60 backdrop-blur-md`}
        >
            <Icon className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={2.8} />
        </motion.div>

        <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + index * 0.15 }}
            className="text-xs font-bold text-gray-700 tracking-wider uppercase"
        >
            {label}
        </motion.span>
    </motion.div>
);


export default FloatingIcon;
import { motion } from "framer-motion";

const FloatingIcon = ({
    color,
    label,
    offset,
    index,
    isRightSide = false,
    onClick,
}: {
    color: string;
    label: string;
    offset: boolean;
    index: number;
    isRightSide?: boolean;
    onClick?: () => void;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{
            scale: 1.3,
            y: -16,
            transition: { duration: 0.5 },
        }}
        onClick={onClick}
        className={`flex items-center gap-5 cursor-pointer ${offset ? (isRightSide ? "pl-20" : "pr-20") : ""
            }`}
    >
        {!isRightSide && (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.15 }}
                className="text-xs font-bold text-gray-700 tracking-wider uppercase"
            >
                {label}
            </motion.div>
        )}

        <div
            className={`w-12 h-12 ${color} rounded-full shadow-2xl flex items-center justify-center border-4 border-white/60 backdrop-blur-md`}
        >
        </div>

        {isRightSide && (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.15 }}
                className="text-xs font-bold text-gray-700 tracking-wider uppercase"
            >
                {label}
            </motion.div>
        )}
    </motion.div>
);

export default FloatingIcon;
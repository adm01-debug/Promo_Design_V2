import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const BackButton = () => {
  const navigate = useNavigate();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground"
          onClick={() => navigate(-1)}
          aria-label="Voltar para a tela anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">Voltar (Esc)</p>
      </TooltipContent>
    </Tooltip>
  );
};

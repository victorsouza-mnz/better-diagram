import type { NodeId } from "../shared/ids.js";
import type { Rect } from "../shared/geometry.js";
import { fitPreservingAspect, translate } from "../shared/geometry.js";
import { preservesAspectRatio, type NodeContent } from "./NodeContent.js";
import type { TextAlign } from "./TextAlign.js";
import type { TextFormat } from "./TextFormat.js";
import { NotATextNode } from "./errors.js";

/**
 * Entidade nó.
 *
 * Chama-se `DiagramNode`, e não `Node`, porque `Node` é um tipo global do DOM: o
 * nome solto compila em qualquer lugar e produz erro de tipo incompreensível na
 * camada de apresentação. Na linguagem ubíqua do projeto continua sendo "nó".
 *
 * Imutável: toda operação devolve um nó novo. Ver a nota sobre imutabilidade no
 * `Diagram`.
 */
export class DiagramNode {
  constructor(
    readonly id: NodeId,
    readonly rect: Rect,
    readonly content: NodeContent,
    readonly label: string = "",
    readonly z: number = 0,
  ) {}

  private with(
    changes: Partial<{ rect: Rect; content: NodeContent; label: string; z: number }>,
  ): DiagramNode {
    return new DiagramNode(
      this.id,
      changes.rect ?? this.rect,
      changes.content ?? this.content,
      changes.label ?? this.label,
      changes.z ?? this.z,
    );
  }

  movedBy(dx: number, dy: number): DiagramNode {
    return this.with({ rect: translate(this.rect, dx, dy) });
  }

  /**
   * Redimensiona para `target`. Nó de ícone encaixa dentro do alvo mantendo a
   * proporção atual em vez de assumir o retângulo pedido.
   */
  resizedTo(target: Rect): DiagramNode {
    const next = preservesAspectRatio(this.content)
      ? fitPreservingAspect(target, this.rect.w / this.rect.h)
      : target;
    return this.with({ rect: next });
  }

  labeled(label: string): DiagramNode {
    return this.with({ label });
  }

  atDepth(z: number): DiagramNode {
    return this.with({ z });
  }

  /**
   * Muda o alinhamento do rótulo dentro da caixa — só existe em nó de TEXTO.
   *
   * O painel de propriedades só mostra este controle para `kind === "text"`, então
   * chegar aqui com outro `kind` é bug de quem chamou, não entrada inválida do
   * usuário — por isso lança, em vez de ignorar em silêncio.
   */
  withTextAlign(align: TextAlign): DiagramNode {
    if (this.content.kind !== "text") throw new NotATextNode(this.id);
    return this.with({ content: { ...this.content, align } });
  }

  /** Muda entre texto simples e código JS — mesma regra de `withTextAlign`. */
  withTextFormat(format: TextFormat): DiagramNode {
    if (this.content.kind !== "text") throw new NotATextNode(this.id);
    return this.with({ content: { ...this.content, format } });
  }
}

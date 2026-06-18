import json
import time
from datetime import datetime
from urllib.parse import urlencode

import requests


BASE_URL = "https://dadosabertos.compras.gov.br/modulo-material/4_consultarItemMaterial"
TOTAL_PAGINAS = 686
ARQUIVO_SAIDA = "itens-material-completo.json"


def buscar_com_retry(url: str, tentativas: int = 3) -> dict:
    for tentativa in range(1, tentativas + 1):
        try:
            response = requests.get(
                url,
                headers={"Accept": "application/json"},
                timeout=30,
            )

            response.raise_for_status()
            return response.json()

        except requests.RequestException as error:
            print(f"Erro na tentativa {tentativa}/{tentativas}: {error}")

            if tentativa == tentativas:
                raise

            time.sleep(tentativa)


def buscar_pagina(pagina: int) -> dict:
    params = urlencode({"pagina": pagina})
    url = f"{BASE_URL}?{params}"

    print(f"Buscando página {pagina}...")

    data = buscar_com_retry(url)

    if "resultado" not in data or not isinstance(data["resultado"], list):
        raise ValueError(f"Resposta inválida na página {pagina}")

    return data


def main():
    todos_itens = []

    total_registros = 0
    total_paginas = TOTAL_PAGINAS

    for pagina in range(1, TOTAL_PAGINAS + 1):
        data = buscar_pagina(pagina)

        todos_itens.extend(data["resultado"])

        total_registros = data.get("totalRegistros", total_registros)
        total_paginas = data.get("totalPaginas", total_paginas)

        # Pausa pequena para evitar sobrecarregar a API
        time.sleep(0.2)

    resultado_final = {
        "totalRegistros": total_registros,
        "totalPaginas": total_paginas,
        "totalItensColetados": len(todos_itens),
        "dataGeracao": datetime.now().isoformat(),
        "resultado": todos_itens,
    }

    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as arquivo:
        json.dump(resultado_final, arquivo, ensure_ascii=False, indent=2)

    print("Arquivo gerado com sucesso!")
    print(f"Arquivo: {ARQUIVO_SAIDA}")
    print(f"Total de itens coletados: {len(todos_itens)}")


if __name__ == "__main__":
    main()
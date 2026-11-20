import { useState } from 'react';

const pythonScript = `#!/usr/bin/env python3
"""
🐍 Web Scraper & Data Analyzer
Скрипт для парсинга веб-страниц и анализа данных.
Автор: Python Script Downloader
"""

import requests
import json
import csv
import os
import sys
from datetime import datetime
from collections import Counter
from urllib.parse import urlparse
from bs4 import BeautifulSoup


class WebScraper:
    """Класс для парсинга веб-страниц."""
    
    def __init__(self, base_url: str, delay: float = 1.0):
        self.base_url = base_url
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                          'AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/120.0.0.0 Safari/537.36'
        })
        self.data = []
        
    def fetch_page(self, url: str) -> BeautifulSoup:
        """Загружает страницу и возвращает объект BeautifulSoup."""
        import time
        time.sleep(self.delay)  # Уважение к серверу
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            response.encoding = response.apparent_encoding
            return BeautifulSoup(response.text, 'html.parser')
        except requests.RequestException as e:
            print(f"❌ Ошибка при загрузке {url}: {e}")
            return None
    
    def extract_links(self, soup: BeautifulSoup) -> list:
        """Извлекает все ссылки со страницы."""
        links = []
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            text = a_tag.get_text(strip=True)
            links.append({
                'url': href,
                'text': text,
                'domain': urlparse(href).netloc
            })
        return links
    
    def extract_metadata(self, soup: BeautifulSoup) -> dict:
        """Извлекает мета-данные страницы."""
        metadata = {
            'title': soup.title.string if soup.title else 'N/A',
            'description': '',
            'keywords': '',
            'language': ''
        }
        
        for meta in soup.find_all('meta'):
            name = meta.get('name', '').lower()
            content = meta.get('content', '')
            if name == 'description':
                metadata['description'] = content
            elif name == 'keywords':
                metadata['keywords'] = content
            elif name == 'language':
                metadata['language'] = content
        
        return metadata
    
    def extract_headings(self, soup: BeautifulSoup) -> dict:
        """Извлекает заголовки h1-h6."""
        headings = {}
        for i in range(1, 7):
            tags = soup.find_all(f'h{i}')
            if tags:
                headings[f'h{i}'] = [tag.get_text(strip=True) for tag in tags]
        return headings
    
    def scrape(self, max_pages: int = 5) -> list:
        """Основной метод парсинга."""
        print(f"🚀 Начинаю парсинг: {self.base_url}")
        print(f"📄 Максимум страниц: {max_pages}")
        print("-" * 50)
        
        soup = self.fetch_page(self.base_url)
        if not soup:
            return []
        
        # Собираем данные с главной страницы
        page_data = {
            'url': self.base_url,
            'timestamp': datetime.now().isoformat(),
            'metadata': self.extract_metadata(soup),
            'headings': self.extract_headings(soup),
            'links_count': len(self.extract_links(soup)),
            'images_count': len(soup.find_all('img')),
            'paragraphs_count': len(soup.find_all('p')),
        }
        self.data.append(page_data)
        print(f"✅ Страница 1 обработана: {page_data['metadata']['title']}")
        
        # Собираем внутренние ссылки для дальнейшего парсинга
        all_links = self.extract_links(soup)
        domain = urlparse(self.base_url).netloc
        internal_links = [
            link['url'] for link in all_links 
            if urlparse(link['url']).netloc == domain or link['url'].startswith('/')
        ][:max_pages - 1]
        
        for i, link in enumerate(internal_links, 2):
            full_url = link if link.startswith('http') else f"{self.base_url.rstrip('/')}{link}"
            soup = self.fetch_page(full_url)
            if soup:
                page_data = {
                    'url': full_url,
                    'timestamp': datetime.now().isoformat(),
                    'metadata': self.extract_metadata(soup),
                    'headings': self.extract_headings(soup),
                    'links_count': len(self.extract_links(soup)),
                    'images_count': len(soup.find_all('img')),
                    'paragraphs_count': len(soup.find_all('p')),
                }
                self.data.append(page_data)
                print(f"✅ Страница {i} обработана: {page_data['metadata']['title']}")
        
        print("-" * 50)
        print(f"🎉 Парсинг завершён! Обработано страниц: {len(self.data)}")
        return self.data


class DataAnalyzer:
    """Класс для анализа собранных данных."""
    
    def __init__(self, data: list):
        self.data = data
    
    def summary(self) -> dict:
        """Создаёт сводку по данным."""
        total_links = sum(page.get('links_count', 0) for page in self.data)
        total_images = sum(page.get('images_count', 0) for page in self.data)
        total_paragraphs = sum(page.get('paragraphs_count', 0) for page in self.data)
        
        return {
            'pages_analyzed': len(self.data),
            'total_links': total_links,
            'total_images': total_images,
            'total_paragraphs': total_paragraphs,
            'avg_links_per_page': round(total_links / max(len(self.data), 1), 2),
            'avg_paragraphs_per_page': round(total_paragraphs / max(len(self.data), 1), 2),
        }
    
    def word_frequency(self, top_n: int = 20) -> list:
        """Анализ частотности слов в заголовках."""
        words = []
        for page in self.data:
            headings = page.get('headings', {})
            for level, texts in headings.items():
                for text in texts:
                    words.extend(text.lower().split())
        
        # Фильтруем короткие слова
        words = [w for w in words if len(w) > 2]
        return Counter(words).most_common(top_n)
    
    def export_json(self, filename: str = 'scrape_results.json'):
        """Экспорт данных в JSON."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                'scrape_date': datetime.now().isoformat(),
                'summary': self.summary(),
                'pages': self.data,
                'top_words': self.word_frequency()
            }, f, ensure_ascii=False, indent=2)
        print(f"📁 Данные сохранены в {filename}")
    
    def export_csv(self, filename: str = 'scrape_results.csv'):
        """Экспорт данных в CSV."""
        if not self.data:
            print("⚠️ Нет данных для экспорта")
            return
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'url', 'timestamp', 'links_count', 'images_count', 'paragraphs_count'
            ])
            writer.writeheader()
            for page in self.data:
                writer.writerow({
                    'url': page['url'],
                    'timestamp': page['timestamp'],
                    'links_count': page['links_count'],
                    'images_count': page['images_count'],
                    'paragraphs_count': page['paragraphs_count'],
                })
        print(f"📁 Данные сохранены в {filename}")


def main():
    """Точка входа в приложение."""
    print("=" * 60)
    print("🐍 Web Scraper & Data Analyzer v1.0")
    print("=" * 60)
    
    # Получаем URL от пользователя
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input("\\n🔗 Введите URL для парсинга: ").strip()
        if not url:
            url = "https://example.com"
    
    if not url.startswith('http'):
        url = 'https://' + url
    
    # Запускаем парсинг
    scraper = WebScraper(url, delay=0.5)
    data = scraper.scrape(max_pages=3)
    
    if data:
        # Анализируем данные
        analyzer = DataAnalyzer(data)
        
        print("\\n📊 Результаты анализа:")
        print("-" * 40)
        summary = analyzer.summary()
        for key, value in summary.items():
            print(f"  {key}: {value}")
        
        print("\\n📝 Топ-10 частых слов в заголовках:")
        for word, count in analyzer.word_frequency(10):
            print(f"  '{word}': {count}")
        
        # Экспортируем
        analyzer.export_json()
        analyzer.export_csv()
        
        print("\\n✨ Готово!")
    else:
        print("\\n⚠️ Не удалось получить данные.")


if __name__ == '__main__':
    main()
`;

function App() {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([pythonScript], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'web_scraper.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Простая подсветка синтаксиса
  const highlightPython = (code: string) => {
    const lines = code.split('\n');
    return lines.map((line, idx) => {
      let highlighted = line
        // Комментарии
        .replace(/(#.*)$/gm, '<span class="text-gray-500 italic">$1</span>')
        // Строки в двойных кавычках
        .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-green-400">$1</span>')
        // Строки в одинарных кавычках
        .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-green-400">$1</span>')
        // Ключевые слова
        .replace(/\b(def|class|import|from|return|if|else|elif|for|in|while|try|except|with|as|not|and|or|True|False|None|print|self)\b/g, '<span class="text-purple-400 font-semibold">$1</span>')
        // Числа
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>')
        // Функции
        .replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="text-blue-400">$1</span>(')
        // Декораторы
        .replace(/(@\w+)/g, '<span class="text-yellow-400">$1</span>');

      return (
        <div key={idx} className="flex">
          <span className="select-none text-gray-600 w-12 text-right pr-4 flex-shrink-0">
            {idx + 1}
          </span>
          <span
            className="flex-1"
            dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }}
          />
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🐍</div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Python Script Downloader
              </h1>
              <p className="text-xs text-gray-400">Web Scraper & Data Analyzer</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-gray-600 hover:border-gray-500"
            >
              {copied ? (
                <>
                  <span className="text-green-400">✓</span> Скопировано!
                </>
              ) : (
                <>
                  <span>📋</span> Копировать
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transition-all duration-200 flex items-center gap-2 text-sm font-bold shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105 active:scale-95"
            >
              <span>⬇️</span> Скачать .py файл
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📄</span>
              <span className="font-semibold text-gray-200">web_scraper.py</span>
            </div>
            <p className="text-sm text-gray-400">
              Скрипт для парсинга веб-страниц и анализа данных
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📦</span>
              <span className="font-semibold text-gray-200">Зависимости</span>
            </div>
            <p className="text-sm text-gray-400">
              requests, beautifulsoup4
            </p>
            <code className="text-xs text-green-400 mt-1 block">
              pip install requests beautifulsoup4
            </code>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🐍</span>
              <span className="font-semibold text-gray-200">Python 3.8+</span>
            </div>
            <p className="text-sm text-gray-400">
              Совместим с Python 3.8 и выше
            </p>
          </div>
        </div>

        {/* Code Block */}
        <div className="rounded-xl overflow-hidden border border-gray-700/50 shadow-2xl shadow-black/20">
          {/* Editor Header */}
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="ml-3 text-sm text-gray-400 font-mono">web_scraper.py</span>
            </div>
            <span className="text-xs text-gray-500">
              {pythonScript.split('\n').length} строк
            </span>
          </div>

          {/* Code Content */}
          <div className="bg-[#1a1b26] p-4 overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-sm leading-6">
            {highlightPython(pythonScript)}
          </div>
        </div>

        {/* Download Section */}
        <div className="mt-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Готовы скачать скрипт?</h2>
          <p className="text-gray-400 mb-4">
            Нажмите кнопку ниже, чтобы получить файл <code className="bg-gray-800 px-2 py-0.5 rounded text-green-400">web_scraper.py</code>
          </p>
          <button
            onClick={handleDownload}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transition-all duration-200 flex items-center gap-3 text-lg font-bold shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105 active:scale-95 mx-auto"
          >
            <span className="text-2xl">⬇️</span> Скачать web_scraper.py
          </button>
          <p className="text-xs text-gray-500 mt-3">
            Размер файла: ~{Math.round(pythonScript.length / 1024 * 10) / 10} KB
          </p>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>📖</span> Как использовать
          </h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="bg-green-500/20 text-green-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
              <p>Скачайте файл <code className="bg-gray-700 px-1.5 py-0.5 rounded text-green-400">web_scraper.py</code></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-green-500/20 text-green-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
              <p>Установите зависимости: <code className="bg-gray-700 px-1.5 py-0.5 rounded text-green-400">pip install requests beautifulsoup4</code></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-green-500/20 text-green-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
              <p>Запустите скрипт: <code className="bg-gray-700 px-1.5 py-0.5 rounded text-green-400">python web_scraper.py https://example.com</code></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-green-500/20 text-green-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
              <p>Результаты будут сохранены в файлы <code className="bg-gray-700 px-1.5 py-0.5 rounded text-green-400">.json</code> и <code className="bg-gray-700 px-1.5 py-0.5 rounded text-green-400">.csv</code></p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700/50 mt-12 py-6 text-center text-sm text-gray-500">
        <p>🐍 Python Script Downloader — Скачивайте Python-скрипты одним кликом</p>
      </footer>
    </div>
  );
}

export default App;

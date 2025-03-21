export const phpSnippet = {
  name: 'PHP',
  code: `<?php

class WeatherStation {
    private $temperatures = [];
    
    public function recordTemperature($temp, $date = null) {
        $date = $date ?: date('Y-m-d');
        $this->temperatures[$date] = $temp;
    }
    
    public function getAverageTemperature() {
        if (empty($this->temperatures)) {
            return 0;
        }
        return array_sum($this->temperatures) / count($this->temperatures);
    }
    
    public function getTemperatureRange() {
        if (empty($this->temperatures)) {
            return [0, 0];
        }
        return [
            min($this->temperatures),
            max($this->temperatures)
        ];
    }
    
    public function generateReport() {
        echo "Weather Station Report\\n";
        echo "--------------------\\n\\n";
        
        echo "Recorded Temperatures:\\n";
        foreach ($this->temperatures as $date => $temp) {
            echo "$date: {$temp}°C\\n";
        }
        
        $avg = $this->getAverageTemperature();
        [$min, $max] = $this->getTemperatureRange();
        
        echo "\\nStatistics:\\n";
        echo "Average Temperature: " . number_format($avg, 1) . "°C\\n";
        echo "Temperature Range: {$min}°C to {$max}°C\\n";
    }
}

// Test the WeatherStation
$station = new WeatherStation();

$station->recordTemperature(23.5, '2025-01-01');
$station->recordTemperature(25.0, '2025-01-02');
$station->recordTemperature(22.8, '2025-01-03');
$station->recordTemperature(24.2, '2025-01-04');

$station->generateReport();`
};
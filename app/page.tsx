"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, RefreshCw, Sun } from "lucide-react"

export default function SunSafetyApp() {
  const [settings, setSettings] = useState({
    latitude: "",
    longitude: "",
    skinType: "",
  })

  const [uvData, setUvData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("home")

  // Load settings from localStorage on initial render
  useEffect(() => {
    const savedSettings = localStorage.getItem("sunSafetySettings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  // Check if settings are complete
  const isSettingsComplete = () => {
    return settings.latitude && settings.longitude && settings.skinType
  }

  // Save settings to localStorage
  const saveSettings = (newSettings) => {
    localStorage.setItem("sunSafetySettings", JSON.stringify(newSettings))
    setSettings(newSettings)
  }

  // Fetch UV data from API
  const fetchUvData = async () => {
    if (!isSettingsComplete()) {
      alert("Please complete your settings first.")
      setActiveTab("settings")
      return
    }

    setLoading(true)
    try {
      const url = `https://currentuvindex.com/api/v1/uvi?latitude=${settings.latitude}&longitude=${settings.longitude}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch UV data")
      }

      const data = await response.json()
      setUvData(data)
    } catch (error) {
      console.error("Error fetching UV data:", error)
      alert("Failed to fetch UV data. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // Get UV risk level information
  const getUvRiskLevel = (uvIndex) => {
    if (uvIndex < 3) {
      return { label: "Low UV", color: "bg-green-500", textColor: "text-green-500" }
    } else if (uvIndex < 6) {
      return { label: "Moderate UV", color: "bg-yellow-500", textColor: "text-yellow-500" }
    } else if (uvIndex < 8) {
      return { label: "High UV", color: "bg-orange-500", textColor: "text-orange-500" }
    } else if (uvIndex < 11) {
      return { label: "Very High UV", color: "bg-red-500", textColor: "text-red-500" }
    } else {
      return { label: "Extreme UV", color: "bg-purple-600", textColor: "text-purple-600" }
    }
  }

  // Calculate safe time in the sun based on UV index and skin type
  const calculateSafeTime = (uvIndex, skinType) => {
    if (uvIndex <= 0) return 0

    // Base safe exposure time in minutes for skin type 1 at UV index 1
    const baseSafeTime = 67 // ~67 minutes

    // Skin type multiplier (approximate)
    const skinTypeMultiplier = {
      "1": 1,
      "2": 1.5,
      "3": 2,
      "4": 2.5,
      "5": 3,
      "6": 4,
    }

    // Calculate safe time
    // Safe time decreases as UV index increases (inverse relationship)
    const safeTime = Math.round((baseSafeTime * skinTypeMultiplier[skinType]) / uvIndex)

    return safeTime
  }

  // Handle settings form submission
  const handleSettingsSubmit = (e) => {
    e.preventDefault()
    saveSettings(settings)
    setActiveTab("home")
    fetchUvData()
  }

  // Handle settings change
  const handleSettingsChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Fetch data on initial load if settings are complete
  useEffect(() => {
    if (isSettingsComplete()) {
      fetchUvData()
    }
  }, [])

  // Get skin type display text
  const getSkinTypeDisplay = () => {
    const skinTypeMap = {
      "1": "Type I (Very fair)",
      "2": "Type II (Fair)",
      "3": "Type III (Medium)",
      "4": "Type IV (Olive)",
      "5": "Type V (Brown)",
      "6": "Type VI (Dark brown/black)",
    }
    return settings.skinType ? skinTypeMap[settings.skinType] : "Not set"
  }

  // Format time for display
  const formatTime = (timeString) => {
    const time = new Date(timeString)
    return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Get all UV data points combined
  const getAllUvDataPoints = () => {
    if (!uvData) return []
    return [...(uvData.history || []), uvData.now, ...(uvData.forecast || [])].sort(
      (a, b) => new Date(a.time) - new Date(b.time),
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-orange-500 flex items-center justify-center gap-2">
          <Sun className="h-8 w-8" /> Sun Safety Tracker
        </h1>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
              <p>Loading UV data...</p>
            </div>
          ) : !isSettingsComplete() ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <AlertCircle className="h-12 w-12 text-orange-500" />
                  <h2 className="text-xl font-semibold">Settings Required</h2>
                  <p>Please complete your settings to view sun safety information.</p>
                  <Button onClick={() => setActiveTab("settings")}>Go to Settings</Button>
                </div>
              </CardContent>
            </Card>
          ) : !uvData ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <AlertCircle className="h-12 w-12 text-orange-500" />
                  <h2 className="text-xl font-semibold">No Data Available</h2>
                  <p>Click the button below to fetch UV data.</p>
                  <Button onClick={fetchUvData}>Fetch UV Data</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <UvCircleWidget uvData={getAllUvDataPoints()} initialTime={uvData.now.time} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Safe Sun Exposure</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-500 mb-2">
                      {calculateSafeTime(uvData.now.uvi, settings.skinType)} min
                    </div>
                    <p className="text-gray-500 mb-4">estimated safe time without sunscreen</p>
                    <p className="text-sm">
                      Based on skin type: <span className="font-medium">{getSkinTypeDisplay()}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Location: {settings.latitude}, {settings.longitude}
                </p>
                <Button onClick={fetchUvData} size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 40.6943"
                      value={settings.latitude}
                      onChange={(e) => handleSettingsChange("latitude", e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="0.0001"
                      placeholder="e.g. -73.9249"
                      value={settings.longitude}
                      onChange={(e) => handleSettingsChange("longitude", e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="skin-type">Fitzpatrick Skin Type</Label>
                    <Select
                      value={settings.skinType}
                      onValueChange={(value) => handleSettingsChange("skinType", value)}
                      required
                    >
                      <SelectTrigger id="skin-type">
                        <SelectValue placeholder="Select your skin type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Type I - Very fair, always burns</SelectItem>
                        <SelectItem value="2">Type II - Fair, burns easily</SelectItem>
                        <SelectItem value="3">Type III - Medium, burns moderately</SelectItem>
                        <SelectItem value="4">Type IV - Olive, burns minimally</SelectItem>
                        <SelectItem value="5">Type V - Brown, rarely burns</SelectItem>
                        <SelectItem value="6">Type VI - Dark brown/black, never burns</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Save Settings
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>About the Fitzpatrick Scale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                The Fitzpatrick scale classifies skin types based on how they respond to sun exposure:
              </p>
              <ul className="space-y-2 list-disc pl-5">
                <li>
                  <strong>Type I:</strong> Very fair skin, always burns, never tans
                </li>
                <li>
                  <strong>Type II:</strong> Fair skin, burns easily, tans minimally
                </li>
                <li>
                  <strong>Type III:</strong> Medium skin, burns moderately, tans gradually
                </li>
                <li>
                  <strong>Type IV:</strong> Olive skin, burns minimally, tans well
                </li>
                <li>
                  <strong>Type V:</strong> Brown skin, rarely burns, tans darkly
                </li>
                <li>
                  <strong>Type VI:</strong> Dark brown/black skin, never burns
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// UV Circle Widget Component
function UvCircleWidget({ uvData, initialTime }) {
  const [selectedTime, setSelectedTime] = useState(initialTime)
  const [selectedUvIndex, setSelectedUvIndex] = useState(null)
  const circleRef = useRef(null)

  // Get UV risk level
  const getRiskLevel = (index) => {
    if (index < 3) return { label: "Low UV", color: "#2ed573" }
    if (index < 6) return { label: "Moderate UV", color: "#ffa502" }
    if (index < 8) return { label: "High UV", color: "#ff7f50" }
    if (index < 11) return { label: "Very High UV", color: "#ff4757" }
    return { label: "Extreme UV", color: "#9c27b0" }
  }

  // Format time for display
  const formatTime = (timeString) => {
    const time = new Date(timeString)
    return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Find the closest data point to a given time
  const findClosestDataPoint = (targetTime) => {
    if (!uvData || uvData.length === 0) return null

    const targetDate = new Date(targetTime)
    let closestPoint = uvData[0]
    let minDiff = Math.abs(new Date(closestPoint.time) - targetDate)

    for (let i = 1; i < uvData.length; i++) {
      const diff = Math.abs(new Date(uvData[i].time) - targetDate)
      if (diff < minDiff) {
        minDiff = diff
        closestPoint = uvData[i]
      }
    }

    return closestPoint
  }

  // Initialize with the current UV data
  useEffect(() => {
    if (initialTime && uvData && uvData.length > 0) {
      const initialDataPoint = findClosestDataPoint(initialTime)
      if (initialDataPoint) {
        setSelectedTime(initialDataPoint.time)
        setSelectedUvIndex(initialDataPoint.uvi)
      }
    }
  }, [initialTime, uvData])

  // Handle click on the circle
  const handleCircleClick = (e) => {
    if (!circleRef.current || !uvData || uvData.length === 0) return

    // Get circle center and radius
    const rect = circleRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Calculate angle from center to click point
    const clickX = e.clientX - centerX
    const clickY = e.clientY - centerY
    let angle = Math.atan2(clickY, clickX) * (180 / Math.PI)

    // Convert to clock angle (0 at top, clockwise)
    angle = (angle + 90) % 360
    if (angle < 0) angle += 360

    // Convert angle to hour (0-23)
    const hour = Math.floor((angle / 360) * 24)

    // Get current date and set the hour
    const now = new Date()
    const targetDate = new Date(now.setHours(hour, 0, 0, 0))

    // Find the closest data point
    const closestPoint = findClosestDataPoint(targetDate)
    if (closestPoint) {
      setSelectedTime(closestPoint.time)
      setSelectedUvIndex(closestPoint.uvi)
    }
  }

  // Get the selected data point
  const selectedDataPoint = selectedTime && uvData ? findClosestDataPoint(selectedTime) : null
  const riskLevel = selectedDataPoint ? getRiskLevel(selectedDataPoint.uvi) : { label: "", color: "#ccc" }

  return (
    <div className="relative w-64 h-64 cursor-pointer" ref={circleRef} onClick={handleCircleClick}>
      {/* Colored ring */}
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Gradient definition */}
        <defs>
          <linearGradient id="uvGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2ed573" />
            <stop offset="25%" stopColor="#ffa502" />
            <stop offset="50%" stopColor="#ff7f50" />
            <stop offset="75%" stopColor="#ff4757" />
            <stop offset="100%" stopColor="#9c27b0" />
          </linearGradient>
        </defs>

        {/* Colored ring */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#uvGradient)" strokeWidth="8" />

        {/* Hour numbers */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180
          return (
            <text
              key={i}
              x={50 + 38 * Math.sin(angle)}
              y={50 - 38 * Math.cos(angle)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="4"
              fontWeight="bold"
            >
              {i === 0 ? 12 : i}
            </text>
          )
        })}

        {/* Data points on the circle */}
        {uvData &&
          uvData.map((point, index) => {
            const time = new Date(point.time)
            const hours = time.getHours() % 12
            const minutes = time.getMinutes()
            const angle = ((hours + minutes / 60) * 30 * Math.PI) / 180
            const isSelected = selectedTime === point.time

            return (
              <circle
                key={index}
                cx={50 + 45 * Math.sin(angle)}
                cy={50 - 45 * Math.cos(angle)}
                r={isSelected ? "3" : "2"}
                fill={isSelected ? "white" : getRiskLevel(point.uvi).color}
                stroke={isSelected ? "white" : "none"}
                strokeWidth="1"
              />
            )
          })}
      </svg>

      {/* Center circle with UV info */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-36 h-36 rounded-full bg-gray-900 flex flex-col items-center justify-center text-white">
          {selectedDataPoint ? (
            <>
              <div className="text-lg font-medium">{formatTime(selectedDataPoint.time)}</div>
              <div className="text-3xl font-bold my-1 text-orange-500">{selectedDataPoint.uvi.toFixed(1)}</div>
              <div className="text-sm font-medium">{riskLevel.label}</div>
            </>
          ) : (
            <div className="text-lg">Select a time</div>
          )}
        </div>
      </div>
    </div>
  )
}

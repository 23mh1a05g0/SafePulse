package com.safepulse.backend.controller;

import com.safepulse.backend.dto.SosRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sos")
public class SosController {

    @PostMapping
    public ResponseEntity<String> receiveSOS(
            @RequestBody SosRequest request) {

        System.out.println("===== SOS RECEIVED =====");

        System.out.println(
                "Event ID: " + request.getEventId());

        System.out.println(
                "Latitude: " + request.getLatitude());

        System.out.println(
                "Longitude: " + request.getLongitude());

        System.out.println(
                "Severity: " + request.getSeverity());

        System.out.println(
                "Location Status: " + request.getLocationStatus());

        System.out.println("========================");

        return ResponseEntity.ok(
                "SOS received successfully");
    }
}
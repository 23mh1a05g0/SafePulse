package com.safepulse.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safepulse.backend.dto.SosRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SosController.class)
class SosControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testReceiveSOS() throws Exception {
        SosRequest request = new SosRequest();
        request.setEventId("EVT-123");
        request.setLatitude(40.7128);
        request.setLongitude(-74.0060);
        request.setSeverity("HIGH");
        request.setLocationStatus("ACCURATE");

        mockMvc.perform(post("/api/sos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("SOS received successfully"));
    }
}
